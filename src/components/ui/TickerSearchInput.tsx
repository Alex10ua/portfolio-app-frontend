import { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useTickerSearch } from '../../hooks/useWatchlist';
import type { TickerSuggestion } from '../../types/watchlist';

interface Props {
  portfolioId: string;
  /** The symbol itself — this is what the form stores. */
  value: string;
  onChange: (ticker: string) => void;
  /** Fired only when a suggestion is chosen, so callers can fill currency/price hints. */
  onPick?: (hit: TickerSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Ticker/company search box — same suggestion source as the Watchlist's
 * AddTickerComposer (`/{portfolioId}/watchlist/search`, i.e. tickers marketData
 * already knows). A symbol the search does not return is still accepted: the
 * field stays free text, the dropdown is only an assist.
 */
export default function TickerSearchInput({
  portfolioId, value, onChange, onPick, placeholder = 'AAPL or Apple', className, disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Only query while the dropdown is open — after a pick the value still matches
  // its own suggestion, and re-searching would reopen the list under the cursor.
  const { data: hits = [], isFetching } = useTickerSearch(portfolioId, open ? value : '');
  const visible = open && hits.length > 0;

  useEffect(() => { setActive(0); }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (hit: TickerSuggestion) => {
    onChange(hit.ticker);
    onPick?.(hit);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visible) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % hits.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + hits.length) % hits.length); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(hits[active]); }   // never submit the form from the list
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className={className ??
        'flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 shadow-sm bg-white dark:bg-slate-800 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500'}>
        <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
        <input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        {isFetching && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-slate-400" />}
      </div>

      {visible && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          {hits.map((hit, i) => (
            <button
              key={hit.ticker}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(hit)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left border-t first:border-t-0 border-slate-100 dark:border-slate-700 ${
                i === active ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}
            >
              <span className="w-[62px] shrink-0 text-[12.5px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{hit.ticker}</span>
              <span className="flex-1 truncate text-[12.5px] text-slate-700 dark:text-slate-200">{hit.name ?? '—'}</span>
              <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-slate-900 dark:text-white">
                {hit.price != null ? hit.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
              </span>
              <span className="w-[34px] shrink-0 text-right text-[11px] text-slate-400 dark:text-slate-500">{hit.currency ?? ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
