const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CHF: 'CHF ',
  PLN: 'zł',
  CZK: 'Kč',
};

export function formatCurrency(value: number | null | undefined, decimals?: number, currency = 'USD'): string {
  if (value == null) return 'N/A';
  const absVal = Math.abs(value);
  const d = decimals !== undefined ? decimals : (absVal > 0 && absVal < 1 ? 6 : 2);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  return `${symbol}${value.toFixed(d)}`;
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value == null) return 'N/A';
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '');
}
