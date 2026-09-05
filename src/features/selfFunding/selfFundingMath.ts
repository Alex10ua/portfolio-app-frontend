import type { AssetType, Holding } from '../../types/holding';
import type { DividendCalendarData } from '../../types/dividendCalendar';

/**
 * Self-funding maths — how many shares a position needs before one period's
 * dividend pays for one more share at today's price.
 *
 *   dpsYear   = holding.dividend          (annual dividend PER SHARE)
 *   price     = holding.currentShareValue (price PER SHARE)
 *   needed    = ceil(price / (dpsYear / periodDivisor))
 *   gapShares = max(0, needed - shareAmount)
 *
 * Both price and dividend come from the same MarketData doc, so the ratio is
 * currency-free and exact even for a pence quote; only the formatted money
 * figures carry a currency, and those use `Holding.currency` like every other
 * page does.
 */

export const PERIODS = ['Yearly', 'Quarterly', 'Monthly'] as const;
export type Period = (typeof PERIODS)[number];

/** annual DPS ÷ this = the dividend one period pays */
export const PERIOD_DIVISOR: Record<Period, number> = { Yearly: 1, Quarterly: 4, Monthly: 12 };

export const SORTS = ['Closest first', 'Cost to close', 'Ticker'] as const;
export type Sort = (typeof SORTS)[number];

export const ALL_TAGS = 'All payers';

/** paymentsPerYear → label. Anything unusual falls back to "N× / year". */
export function cadenceLabel(payments: number | null): string {
  if (payments == null) return 'Unknown';
  return ({ 1: 'Annual', 2: 'Semi-annual', 4: 'Quarterly', 12: 'Monthly' } as Record<number, string>)[payments]
    ?? `${payments}× / year`;
}

export type Tier = 'Self-funding' | 'Close' | 'Far' | 'Very far';

export const TIER_COLOR: Record<Tier, string> = {
  'Self-funding': '#10B981', // green
  Close: '#14B8A6',          // teal
  Far: '#3B82F6',            // blue
  'Very far': '#8B5CF6',     // purple
};

export interface SfRow {
  ticker: string;
  name: string | null;
  assetType: AssetType | null;
  currency: string | null;
  price: number;
  dps: number;
  held: number;
  /** derived from the dividend calendar; null when this ticker isn't in it yet */
  paymentsPerYear: number | null;
  tags: string[];
}

export interface SfCalc {
  /** dividend one period pays, per share */
  perPeriod: number;
  /** one actual payment, per share — null when cadence is unknown */
  perPayment: number | null;
  needed: number;
  gapShares: number;
  gapCost: number;
  /**
   * Shares one period's dividend actually buys at today's price — the headline
   * number, uncapped: 1 = exactly one share (100%), 5.2 = five and a bit (520%).
   * Below 1 it is the fraction of a share the payment covers.
   */
  sharesPerPeriod: number;
  /** `sharesPerPeriod` clamped to 1 — the bar fill, which stops at the threshold */
  progress: number;
  /** dpsYear / price, as a fraction */
  yield: number;
  tier: Tier;
  /** years of dividend-only reinvestment to close the gap; null when nothing is held */
  years: number | null;
}

export function calcSelfFunding(row: SfRow, period: Period): SfCalc {
  const perPeriod = row.dps / PERIOD_DIVISOR[period];
  const needed = Math.max(1, Math.ceil(row.price / perPeriod));
  const gapShares = Math.max(0, needed - row.held);
  const ratio = gapShares / needed;
  const tier: Tier = gapShares === 0 ? 'Self-funding'
    : ratio < 0.25 ? 'Close'
    : ratio < 0.6 ? 'Far'
    : 'Very far';
  const y = row.dps / row.price;
  // Reinvest-only growth: the position compounds at its own yield, no deposits,
  // price and dividend flat. From a zero position nothing compounds, so no answer.
  const years = gapShares === 0 ? 0
    : row.held > 0 && y > 0 ? Math.log(needed / row.held) / Math.log(1 + y)
    : null;
  // Measured against the exact price, not the rounded-up `needed`, so a position
  // past the threshold reads as the real multiple (520%, not "100%+").
  const sharesPerPeriod = (row.held * perPeriod) / row.price;
  return {
    perPeriod,
    perPayment: row.paymentsPerYear ? row.dps / row.paymentsPerYear : null,
    needed,
    gapShares,
    gapCost: gapShares * row.price,
    sharesPerPeriod,
    progress: Math.min(1, sharesPerPeriod),
    yield: y,
    tier,
    years,
  };
}

/**
 * Payments per year per ticker, counted off the dividend calendar (which months a
 * ticker actually pays in). There is no frequency field on a Holding, and the
 * calendar keys are Java month names with no year, so a distinct-month count is
 * the cadence.
 */
export function paymentsPerYearByTicker(calendar: DividendCalendarData | undefined): Record<string, number> {
  const months: Record<string, Set<string>> = {};
  Object.entries(calendar ?? {}).forEach(([month, entries]) => {
    (entries ?? []).forEach((entry) => {
      if (!entry?.ticker) return;
      const key = entry.ticker.toUpperCase();
      if (!months[key]) months[key] = new Set();
      months[key].add(month);
    });
  });
  return Object.fromEntries(Object.entries(months).map(([ticker, set]) => [ticker, set.size]));
}

/**
 * Screenable rows + the count of holdings that can't be screened. A position needs
 * a per-share dividend and a price to divide — which drops non-payers, crypto and
 * custom assets without naming them as a special case.
 */
export function buildRows(
  holdings: Holding[] | undefined,
  payments: Record<string, number>,
  tagsByTicker: Map<string, string[]>,
): { rows: SfRow[]; excluded: number } {
  const held = (holdings ?? []).filter((h) => (h.shareAmount ?? 0) > 0);
  const rows: SfRow[] = [];
  held.forEach((h) => {
    const price = h.currentShareValue ?? 0;
    const dps = h.dividend ?? 0;
    if (!(price > 0) || !(dps > 0)) return;
    rows.push({
      ticker: h.ticker,
      name: h.name,
      assetType: h.assetType,
      currency: h.currency ?? null,
      price,
      dps,
      held: h.shareAmount,
      paymentsPerYear: payments[h.ticker.toUpperCase()] ?? null,
      tags: tagsByTicker.get(h.ticker) ?? [],
    });
  });
  return { rows, excluded: held.length - rows.length };
}
