import type { FxRates } from '../types/fxRate';

export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  /** two-letter tag shown in the flag chip */
  flag: string;
}

/** Selectable base currencies — order is the "All currencies" list order. */
export const CURRENCIES: CurrencyMeta[] = [
  { code: 'EUR', symbol: '€',  name: 'Euro',              flag: 'EU' },
  { code: 'USD', symbol: '$',  name: 'US Dollar',         flag: 'US' },
  { code: 'GBP', symbol: '£',  name: 'Pound Sterling',    flag: 'GB' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc',       flag: 'CH' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty',      flag: 'PL' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona',     flag: 'SE' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone',   flag: 'NO' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone',      flag: 'DK' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna',      flag: 'CZ' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint',  flag: 'HU' },
  { code: 'CAD', symbol: '$',  name: 'Canadian Dollar',   flag: 'CA' },
  { code: 'AUD', symbol: '$',  name: 'Australian Dollar', flag: 'AU' },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',      flag: 'JP' },
  { code: 'SGD', symbol: '$',  name: 'Singapore Dollar',  flag: 'SG' },
  { code: 'HKD', symbol: '$',  name: 'Hong Kong Dollar',  flag: 'HK' },
  { code: 'ILS', symbol: '₪',  name: 'Israeli Shekel',    flag: 'IL' },
];

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currencyMeta(code: string | null | undefined): CurrencyMeta {
  if (!code) return BY_CODE.get('USD')!;
  return BY_CODE.get(normalizeCurrency(code)) ?? { code, symbol: `${code} `, name: code, flag: code.slice(0, 2) };
}

/** GBp/GBx pence collapse to GBP — the same asset, quoted in minor units. */
export function normalizeCurrency(code: string | null | undefined): string {
  if (!code) return 'USD';
  return code === 'GBp' || code === 'GBx' ? 'GBP' : code;
}

/**
 * rateVsEur for a quote currency: units of it per 1 EUR. Pence quotes have no
 * ECB rate of their own — they are GBP × 100, mirroring the backend's
 * FxRateService.getRateForCurrency.
 */
export function rateOf(code: string | null | undefined, rates: FxRates): number {
  if (!code) return 1;
  if (code === 'GBp' || code === 'GBx') {
    const gbp = rates['GBP'];
    return gbp ? gbp * 100 : 1;
  }
  const r = rates[code];
  return r && r !== 0 ? r : 1;
}

/**
 * Convert between two quote currencies with EUR as the pivot:
 * amount ÷ rate(from) = EUR, × rate(to) = target.
 */
export function convert(amount: number, from: string | null | undefined, to: string | null | undefined, rates: FxRates): number {
  if (!Number.isFinite(amount) || amount === 0) return 0;
  if (!to || !from || from === to) return amount;
  return (amount * rateOf(to, rates)) / rateOf(from, rates);
}

/** Sum a {currency: nativeAmount} map into one currency. */
export function convertMap(byCurrency: Record<string, number> | null | undefined, to: string, rates: FxRates): number {
  if (!byCurrency) return 0;
  return Object.entries(byCurrency).reduce((sum, [ccy, amount]) => sum + convert(Number(amount) || 0, ccy, to, rates), 0);
}

export type CurrencyDisplay = 'Symbol' | 'Code' | 'Both';

/**
 * Money in the user's chosen notation. Grouped thousands + fixed decimals so
 * columns line up under `tabular-nums`.
 *
 * The sign is written before the symbol (`-€50.00`); formatting the signed number
 * and prepending the symbol gives `€-50.00`.
 */
export function formatMoney(
  value: number | null | undefined,
  currency: string,
  display: CurrencyDisplay = 'Symbol',
  decimals?: number,
): string {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  const meta = currencyMeta(currency);
  const abs = Math.abs(value);
  const d = decimals !== undefined ? decimals : (abs > 0 && abs < 0.01 ? 6 : 2);
  const num = abs.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const sign = value < 0 ? '-' : '';
  const prefix = display === 'Code' ? '' : meta.symbol;
  const suffix = display === 'Symbol' ? '' : ` ${meta.code}`;
  return `${sign}${prefix}${num}${suffix}`;
}

/**
 * Pence quotes (`GBp`/`GBx`) are the same asset as `GBP` in minor units, and the
 * two travel together on a holding: `MarketData.price` is pence while
 * `Holdings.currency` says GBP. Anything that mixes a market price with a
 * transaction currency has to divide by 100 first or it is out by 100×.
 */
export function isMinorUnit(code: string | null | undefined): boolean {
  return code === 'GBp' || code === 'GBx';
}

/** A price quoted in `quoteCurrency` expressed in the major unit of that currency. */
export function toMajorUnits(value: number, quoteCurrency: string | null | undefined): number {
  return isMinorUnit(quoteCurrency) ? value / 100 : value;
}

/**
 * Heuristic for "this market figure is probably pence" where the quote currency
 * isn't available. Several endpoints report a price or dividend straight from
 * `MarketData` while carrying only the *transaction* currency (the dividend
 * calendar has no currency field at all), and London listings are the one place
 * those disagree: `GBp` against a `GBP` holding, a factor of 100.
 *
 * Prefer the real `MarketData.currency` wherever it is available and treat this as
 * the fallback.
 */
export function looksLikePenceQuote(ticker: string, txCurrency: string | null | undefined): boolean {
  return normalizeCurrency(txCurrency) === 'GBP' && /\.(L|IL)$/i.test(ticker);
}
