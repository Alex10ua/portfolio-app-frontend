import { useEffect, useState } from 'react';
import { Check, Info, Loader2, Plus, Search, X } from 'lucide-react';
import { useTickerPreview, useTickerSearch } from '../../hooks/useWatchlist';
import { formatCurrency } from '../../lib/formatters';
import YieldStrip, { PercentileCell } from './YieldStrip';
import { yieldStats } from './yieldMath';
import type { TickerSuggestion } from '../../types/watchlist';

interface Props {
  portfolioId: string;
  onAdd: (ticker: string, targetYield: number | null) => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}

const SYMBOL = /^[A-Za-z0-9.\-=^]{1,15}$/;

/**
 * Add-ticker row: search what the app already knows, pick a target yield.
 *
 * Suggestions come from tickers marketData has seen. Anything else is still
 * addable by typing the symbol — the backend fetches it from the provider on
 * add, which is why that path is spelled out rather than silently failing.
 */
export default function AddTickerComposer({ portfolioId, onAdd, onCancel, pending, error }: Props) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<TickerSuggestion | null>(null);
  const [target, setTarget] = useState('');

  const { data: hits = [], isFetching } = useTickerSearch(portfolioId, picked ? '' : query);
  const { data: preview, isLoading: previewLoading } = useTickerPreview(portfolioId, picked?.ticker ?? null);
  const stats = preview ? yieldStats(preview, '5Y') : null;

  // the suggested target is the 5Y 90th percentile the backend computed
  useEffect(() => {
    if (preview?.targetYield != null) setTarget(preview.targetYield.toFixed(2));
  }, [preview]);

  const typedSymbol = query.trim().toUpperCase();
  const canAddRaw = !picked && SYMBOL.test(typedSymbol) && !hits.some((h) => h.ticker === typedSymbol);
  const ticker = picked?.ticker ?? (canAddRaw ? typedSymbol : null);
  const targetNumber = parseFloat(target.replace(',', '.'));
  const valid = !!ticker && (!target.trim() || (Number.isFinite(targetNumber) && targetNumber > 0));

  const pick = (hit: TickerSuggestion) => {
    setPicked(hit);
    setQuery(`${hit.ticker} · ${hit.name ?? ''}`);
  };

  const submit = () => {
    if (!ticker || !valid || pending) return;
    onAdd(ticker, target.trim() ? targetNumber : null);
  };

  return (
    <div className="rounded-lg border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-slate-800 shadow-sm p-4 relative z-20">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[260px] relative">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Ticker or company</div>
          <div className="flex items-center gap-2 h-[38px] px-3 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/40">
            <Search className="h-[15px] w-[15px] text-slate-400 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              placeholder="Symbol or name — e.g. O, Realty Income, VZ"
              onChange={(e) => { setQuery(e.target.value); setPicked(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              className="flex-1 bg-transparent text-[13px] text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
            />
            {isFetching && <Loader2 className="h-[15px] w-[15px] animate-spin text-slate-400" />}
            {picked && <Check className="h-[15px] w-[15px] text-green-600 dark:text-green-400" />}
          </div>

          {!picked && hits.length > 0 && (
            <div className="absolute top-[66px] left-0 right-0 z-30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
              {hits.map((hit) => (
                <button
                  key={hit.ticker}
                  onClick={() => pick(hit)}
                  disabled={hit.watched}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left border-t first:border-t-0 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-45 disabled:hover:bg-transparent"
                >
                  <span className="w-[58px] text-[12.5px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{hit.ticker}</span>
                  <span className="flex-1 truncate text-[12.5px] text-slate-700 dark:text-slate-200">{hit.name ?? '—'}</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{hit.watched ? 'on list' : hit.sector ?? ''}</span>
                  <span className="w-[56px] text-right text-[12.5px] font-bold tabular-nums text-slate-900 dark:text-white">
                    {hit.forwardYield != null ? `${hit.forwardYield.toFixed(2)}%` : '—'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Target yield</div>
          <div className="flex items-center gap-1.5 h-[38px] px-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/40">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="auto"
              inputMode="decimal"
              className="w-[58px] bg-transparent text-right text-[14px] font-bold tabular-nums text-slate-900 dark:text-white outline-none placeholder:font-normal placeholder:text-slate-400"
            />
            <span className="text-[12px] font-semibold text-slate-400 dark:text-slate-500">%</span>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!valid || pending}
          className="inline-flex items-center gap-2 h-[38px] px-3.5 rounded-md bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-500 disabled:opacity-45"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {pending ? 'Fetching…' : 'Add to watchlist'}
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center justify-center h-[38px] w-[38px] rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700 text-[12px] text-slate-500 dark:text-slate-400">
        {error ? (
          <span className="text-red-600 dark:text-red-400">{error}</span>
        ) : stats && preview ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>Today <b className="text-slate-900 dark:text-white tabular-nums">{stats.current.toFixed(2)}%</b></span>
            <span>5Y median <b className="text-slate-900 dark:text-white tabular-nums">{stats.median.toFixed(2)}%</b></span>
            <span>5Y 90th pct <b className="text-slate-900 dark:text-white tabular-nums">{stats.p90.toFixed(2)}%</b></span>
            <span className="inline-flex items-center gap-2">
              <YieldStrip stats={stats} width={104} />
              <PercentileCell percentile={stats.percentile} />
              <span>of history below today</span>
            </span>
            <span className="flex-1" />
            <span>
              Buy below{' '}
              <b className="text-slate-900 dark:text-white tabular-nums">
                {Number.isFinite(targetNumber) && targetNumber > 0 && preview.forwardDividend
                  ? formatCurrency((preview.forwardDividend / targetNumber) * 100, 2, preview.currency ?? 'USD')
                  : '—'}
              </b>
            </span>
          </div>
        ) : previewLoading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading stored yield history…
          </span>
        ) : picked ? (
          <span className="inline-flex items-center gap-2">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            No stored yield history for {picked.ticker} yet — adding it fetches price and dividend history from the provider.
          </span>
        ) : canAddRaw ? (
          <span className="inline-flex items-center gap-2">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            {typedSymbol} is not in the local market data. Adding it fetches the symbol from the provider, which takes a few seconds.
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            Leave the target blank and it defaults to the 5-year 90th-percentile yield — the level this ticker only reached in its richest 10% of months.
          </span>
        )}
      </div>
    </div>
  );
}
