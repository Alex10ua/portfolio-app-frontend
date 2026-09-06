import { isDateOnly, parseLocalDate } from './dates';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  GBp: 'p ', // pence (minor unit) — provider price/dividend currency, see CLAUDE.md
  GBx: 'p ',
  CHF: 'CHF ',
  PLN: 'zł',
  CZK: 'Kč',
};

/**
 * The minus sign goes **before** the symbol: `-$50.00`, not `$-50.00`. Prepending
 * the symbol to a signed number is what produced the latter.
 */
export function formatCurrency(value: number | null | undefined, decimals?: number, currency = 'USD'): string {
  if (value == null) return 'N/A';
  const absVal = Math.abs(value);
  const d = decimals !== undefined ? decimals : (absVal > 0 && absVal < 0.01 ? 6 : 2);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  const sign = value < 0 ? '-' : '';
  return `${sign}${symbol}${absVal.toFixed(d)}`;
}

const COMPACT_UNITS: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];

/**
 * "$416.2B" style — for axis ticks/tooltips on filing-scale money values.
 *
 * `Intl.NumberFormat` with `style: 'currency'` throws `RangeError` on anything
 * that is not an ISO 4217 code, and this app has plenty: `GBp` pence quotes, and
 * custom-asset codes a user can invent. So a bad code falls back to the same
 * shape built by hand rather than taking the whole page down with it.
 */
export function formatCompactCurrency(value: number | null | undefined, currency = 'USD'): string {
  if (value == null) return 'N/A';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
    const unit = COMPACT_UNITS.find(([size]) => abs >= size);
    const num = unit ? `${(abs / unit[0]).toFixed(1)}${unit[1]}` : abs.toFixed(abs < 10 ? 2 : 0);
    return `${sign}${symbol}${num}`;
  }
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value == null) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

/**
 * A `LocalDate` from the backend is a calendar day with no instant, so it is
 * rendered as a day — no invented 00:00, and no UTC-midnight-to-local rollback
 * that would show the day before west of UTC. A real timestamp still prints its
 * time.
 */
export function formatDate(dateStr: string): string {
  if (isDateOnly(dateStr)) {
    return parseLocalDate(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
  return new Date(dateStr).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '');
}
