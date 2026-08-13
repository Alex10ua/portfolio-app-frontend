import { Plus, RefreshCw, Search, Target, Trash2 } from 'lucide-react';
import TargetYieldField from './TargetYieldField';
import {
  Chip, SignalCell, TD, TH, TickerCell, formatDay, money, moveClass, percent, signedPercent,
} from './rowBits';
import type { WatchlistEntry } from '../../types/watchlist';

interface Props {
  entries: WatchlistEntry[];
  tagNames: string[];
  tagCounts: Record<string, number>;
  activeTag: string;
  onTag: (tag: string) => void;
  filter: string;
  onFilter: (value: string) => void;
  onAddClick: () => void;
  onTarget: (ticker: string, targetYield: number) => void;
  onRemove: (ticker: string) => void;
  onRefresh: (ticker: string) => void;
  refreshing: string | null;
  composer: React.ReactNode;
  showComposer: boolean;
}

export const ALL_TAGS = 'All watched';

/** Tab 1 — the list itself: what each ticker pays now against what you asked for. */
export default function WatchlistTab({
  entries, tagNames, tagCounts, activeTag, onTag, filter, onFilter,
  onAddClick, onTarget, onRemove, onRefresh, refreshing, composer, showComposer,
}: Props) {
  const atTarget = entries.filter((e) => e.atTarget).length;

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip label={ALL_TAGS} count={tagCounts[ALL_TAGS]} active={activeTag === ALL_TAGS} onClick={() => onTag(ALL_TAGS)} />
        {tagNames.map((tag) => (
          <Chip key={tag} label={`#${tag}`} count={tagCounts[tag]} active={activeTag === tag} onClick={() => onTag(tag)} />
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 h-[34px] w-[220px] px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <input
            value={filter}
            onChange={(e) => onFilter(e.target.value)}
            placeholder="Filter watchlist"
            className="flex-1 bg-transparent text-[12.5px] text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
          />
        </div>
        {!showComposer && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" /> Add ticker
          </button>
        )}
      </div>

      {composer}

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
            {activeTag === ALL_TAGS ? ALL_TAGS : `#${activeTag}`}
          </span>
          <span className="text-[12px] text-slate-500 dark:text-slate-400">{entries.length} tickers watched</span>
          <div className="flex-1" />
          {atTarget > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-green-600 dark:text-green-400">
              <span className="h-[7px] w-[7px] rounded-full bg-green-500" />
              {atTarget} at or past target yield
            </span>
          ) : (
            <span className="text-[12px] text-slate-400 dark:text-slate-500">Nothing at target yet</span>
          )}
        </div>

        {entries.length === 0 ? (
          <button onClick={onAddClick} className="w-full px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <Target className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
            </div>
            <div className="text-[13.5px] font-semibold text-slate-600 dark:text-slate-300">No tickers here yet</div>
            <p className="mx-auto mt-1.5 max-w-[380px] text-[12px] leading-relaxed text-slate-400 dark:text-slate-500">
              Add a ticker and set the dividend yield you would buy it at. The price is watched against that
              level, and the row is flagged the moment the yield gets there.
            </p>
          </button>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} text-left w-[210px]`}>Ticker</th>
                  <th className={`${TH} text-right`}>Last</th>
                  <th className={`${TH} text-right`}>Day</th>
                  <th className={`${TH} text-right`}>Fwd yield</th>
                  <th className={`${TH} text-center w-[112px]`}>Target yield</th>
                  <th className={`${TH} text-right`}>Buy below</th>
                  <th className={`${TH} text-right`}>To target</th>
                  <th className={`${TH} text-left w-[86px]`}>Pays</th>
                  <th className={`${TH} text-left w-[104px]`}>Ex-div</th>
                  <th className={`${TH} text-left w-[92px]`}>Signal</th>
                  <th className={`${TH} w-[72px]`}> </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.ticker}
                    className={`border-t border-slate-100 dark:border-slate-700 ${
                      entry.atTarget ? 'bg-green-50/60 dark:bg-green-500/10' : ''
                    }`}
                  >
                    <td className={TD}><TickerCell entry={entry} /></td>
                    <td className={`${TD} text-right tabular-nums text-slate-900 dark:text-white`}>{money(entry.price, entry)}</td>
                    <td className={`${TD} text-right tabular-nums ${moveClass(entry.dayChangePercent)}`}>
                      {signedPercent(entry.dayChangePercent)}
                    </td>
                    <td className={`${TD} text-right tabular-nums font-bold text-slate-900 dark:text-white`}>
                      {percent(entry.forwardYield)}
                    </td>
                    <td className={`${TD} text-center`}>
                      <TargetYieldField value={entry.targetYield} onCommit={(v) => onTarget(entry.ticker, v)} />
                    </td>
                    <td className={`${TD} text-right tabular-nums text-slate-500 dark:text-slate-400`}>
                      {money(entry.buyBelowPrice, entry)}
                    </td>
                    <td className={`${TD} text-right tabular-nums font-semibold ${
                      entry.atTarget ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {entry.atTarget ? 'reached' : signedPercent(entry.toTargetPercent, 1)}
                    </td>
                    <td className={`${TD} text-slate-500 dark:text-slate-400`}>{entry.dividendFrequency ?? '—'}</td>
                    <td className={`${TD} text-slate-500 dark:text-slate-400`}>{formatDay(entry.exDividendDate)}</td>
                    <td className={TD}><SignalCell entry={entry} /></td>
                    <td className={`${TD} text-right whitespace-nowrap`}>
                      <button
                        onClick={() => onRefresh(entry.ticker)}
                        disabled={refreshing === entry.ticker}
                        title="Re-fetch price, dividends and history"
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-[15px] w-[15px] ${refreshing === entry.ticker ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => onRemove(entry.ticker)}
                        title={`Remove ${entry.ticker} from the watchlist`}
                        className="ml-2.5 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-[15px] w-[15px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
