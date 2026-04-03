export function formatCurrency(value: number | null | undefined, decimals = 2): string {
  if (value == null) return 'N/A';
  return `$${value.toFixed(decimals)}`;
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
