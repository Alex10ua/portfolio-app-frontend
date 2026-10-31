import { convert, normalizeCurrency } from './currency';
import type { FxRates } from '../types/fxRate';
import type { WealthSummary } from '../types/wealth';

/** Unlike legacy conversion, unavailable FX must never become an implicit 1:1 rate. */
export function convertWealthMap(amounts: Record<string, number> | undefined, base: string, rates: FxRates) {
  const missing: string[] = [];
  let value = 0;
  const rate = (code: string) => code === 'EUR' ? 1
    : code === 'GBp' || code === 'GBx' ? rates.GBP && rates.GBP * 100 : rates[code];
  for (const [currency, raw] of Object.entries(amounts ?? {})) {
    const amount = Number(raw);
    if (!Number.isFinite(amount)) { missing.push(currency); continue; }
    if (amount === 0) continue;
    if (normalizeCurrency(currency) === normalizeCurrency(base)) {
      const fromMinor = currency === 'GBp' || currency === 'GBx';
      const toMinor = base === 'GBp' || base === 'GBx';
      value += amount * (fromMinor ? 0.01 : 1) * (toMinor ? 100 : 1);
    } else if (!(Number(rate(currency)) > 0) || !(Number(rate(base)) > 0)) {
      missing.push(currency);
    } else {
      value += convert(amount, currency, base, { ...rates, EUR: 1 });
    }
  }
  return { value, missing, complete: missing.length === 0 };
}

/**
 * includeProperty = false is a portfolio with real estate hidden: property neither adds to
 * the total nor makes it incomplete (missing FX, unfinished mortgage setup).
 */
export function summarizeWealth(data: WealthSummary, base: string, rates: FxRates, includeProperty = true) {
  const investments = convertWealthMap(data.investmentValueByCurrency, base, rates);
  const cash = convertWealthMap(data.manualCashByCurrency, base, rates);
  const owned = convertWealthMap(data.ownedPropertyValueByCurrency, base, rates);
  const debt = convertWealthMap(data.mortgagePrincipalByCurrency, base, rates);
  const equity = convertWealthMap(data.propertyEquityByCurrency, base, rates);
  const parts = includeProperty ? [investments, cash, owned, debt, equity] : [investments, cash];
  const missingFx = [...new Set(parts.flatMap(part => part.missing))];
  const known = includeProperty ? data.complete : data.missingInvestmentTickers.length === 0;
  return {
    investments: investments.value, cash: cash.value, owned: owned.value,
    debt: debt.value, equity: equity.value,
    total: investments.value + cash.value + (includeProperty ? equity.value : 0),
    missingFx, complete: known && missingFx.length === 0,
  };
}
