export function formatCurrency(value: number | null | undefined, decimals?: number): string {
  if (value == null) return 'N/A';
  const absVal = Math.abs(value);
  // When no explicit precision: use 6 decimal places for sub-unit prices (e.g. fund DJ units ~0.058),
  // otherwise 2 decimal places for normal amounts.
  const d = decimals !== undefined ? decimals : (absVal > 0 && absVal < 1 ? 6 : 2);
  return `$${value.toFixed(d)}`;
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
