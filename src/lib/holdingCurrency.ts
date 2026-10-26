import type { FxRates } from '../types/fxRate';
import type { Holding } from '../types/holding';
import { convert, convertMap, normalizeCurrency, toMajorUnits } from './currency.ts';

/**
 * Brings one holding row into a single currency.
 *
 * The API reports a row's market figures — `currentShareValue`, `currentTotalValue`,
 * `dailyChange`, `dividend` — in the provider's quote currency (`quoteCurrency`), and its
 * cost in the book currency the position was bought in (`currency`). They differ for a
 * London line (quoted in GBp pence, booked in GBP) and for a coin bought in EUR but
 * priced in USD, and in those rows the backend leaves profit null rather than subtract
 * one currency from the other. FX is the client's job, so it happens here: the market
 * figures are converted into the book currency and the profit fields derived from them,
 * after which every money field on the row is in `currency`, as every consumer assumes.
 *
 * The quoted price survives as `quoteShareValue` for the few places that compare it with
 * other provider figures in the quote currency (analyst targets).
 */
export function normalizeHolding(h: Holding, rates: FxRates): Holding {
  const quote = h.quoteCurrency;
  const book = h.currency ?? quote ?? 'USD';

  // Pence → pounds needs no rate at all; only a real currency change goes through FX.
  const toBook = (v: number | null | undefined): number | null => {
    if (v == null) return null;
    if (!quote || quote === book) return v;
    return normalizeCurrency(quote) === normalizeCurrency(book)
      ? toMajorUnits(v, quote)
      : convert(v, quote, book, rates);
  };

  const currentShareValue = toBook(h.currentShareValue);
  const currentTotalValue = toBook(h.currentTotalValue);
  const dividend = toBook(h.dividend);
  const costBasis = h.costBasisByCurrency ? convertMap(h.costBasisByCurrency, book, rates) : h.costBasis;
  const commissions = h.commissionsByCurrency
    ? convertMap(h.commissionsByCurrency, book, rates) : h.commissions;
  const quantity = h.exactShareAmount ?? h.shareAmount;
  const costPerShare = h.costBasisByCurrency && costBasis != null && quantity > 0
    ? costBasis / quantity : h.costPerShare;
  const totalProfit = currentTotalValue != null && costBasis != null
    ? currentTotalValue - costBasis
    : null;

  return {
    ...h,
    currency: book,
    costBasis,
    costPerShare,
    commissions,
    quoteShareValue: h.currentShareValue,
    currentShareValue,
    currentTotalValue,
    dailyChange: toBook(h.dailyChange),
    dividend,
    totalProfit,
    totalProfitPercentage: totalProfit != null && costBasis ? (totalProfit / costBasis) * 100 : null,
    dividendYieldOnCost: dividend != null && costPerShare ? (dividend / costPerShare) * 100 : null,
  };
}

export function normalizeHoldings(holdings: Holding[], rates: FxRates): Holding[] {
  return holdings.map((h) => normalizeHolding(h, rates));
}
