import StockLogo from '../../components/ui/StockLogo';
import { formatCurrency } from '../../lib/formatters';
import type { WatchlistEntry } from '../../types/watchlist';

/** Money in the ticker's own quote currency — the API never converts. */
export function money(value: number | null | undefined, entry: WatchlistEntry): string {
  if (value == null) return '—';
  return formatCurrency(value, 2, entry.currency ?? 'USD');
}

export function percent(value: number | null | undefined, decimals = 2): string {
  return value == null ? '—' : `${value.toFixed(decimals)}%`;
}

export function signedPercent(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function moveClass(value: number | null | undefined): string {
  if (value == null) return 'text-slate-400 dark:text-slate-500';
  return value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';
}

export function formatDay(date: string | null): string {
  if (!date) return '—';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TickerCell({ entry }: { entry: WatchlistEntry }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <StockLogo ticker={entry.ticker} name={entry.name} size="sm" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{entry.ticker}</span>
          {entry.held && (
            <span
              className="rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15"
              title="Also held in this portfolio"
            >
              held
            </span>
          )}
        </div>
        <div className="truncate max-w-[168px] text-[11px] text-slate-500 dark:text-slate-400">{entry.name ?? '—'}</div>
      </div>
    </div>
  );
}

export function SignalCell({ entry, percentile }: { entry: WatchlistEntry; percentile?: number }) {
  if (entry.atTarget) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ring-green-600/20 bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-400">
        BUY
      </span>
    );
  }
  if (percentile != null && percentile >= 90) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ring-blue-600/20 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400">
        CHEAP
      </span>
    );
  }
  return <span className="text-[12px] text-slate-400 dark:text-slate-500">Watching</span>;
}

/** Segmented control matching the range pickers on the other pages. */
export function Segmented<T extends string>({ options, active, onChange }: {
  options: readonly T[]; active: T; onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 gap-0.5">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors ${
            active === option
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function Chip({ label, count, active, onClick }: {
  label: string; count?: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
        active
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {label}
      {count != null && <span className="tabular-nums opacity-60">{count}</span>}
    </button>
  );
}

export const TH = 'text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 py-2';
export const TD = 'px-3 py-2 text-[12.5px]';
