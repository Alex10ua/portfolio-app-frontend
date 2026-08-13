import { Fragment, useMemo } from 'react';
import { ChevronDown, ChevronRight, Download, Filter, Target } from 'lucide-react';
import TargetYieldField from './TargetYieldField';
import YieldHistoryChart from './YieldHistoryChart';
import YieldStrip, { PercentileCell } from './YieldStrip';
import {
  Chip, Segmented, SignalCell, TD, TH, TickerCell, money, percent, signedPercent,
} from './rowBits';
import {
  TF_ORDER, THRESHOLDS, percentileYield, timeframeLabel, yieldStats,
  type Timeframe, type YieldStats,
} from './yieldMath';
import { ALL_TAGS } from './WatchlistTab';
import type { WatchlistEntry } from '../../types/watchlist';

interface Props {
  entries: WatchlistEntry[];
  tagNames: string[];
  activeTag: string;
  onTag: (tag: string) => void;
  timeframe: Timeframe;
  onTimeframe: (tf: Timeframe) => void;
  threshold: number;
  onThreshold: (value: number) => void;
  expanded: string | null;
  onExpand: (ticker: string | null) => void;
  onTarget: (ticker: string, targetYield: number) => void;
}

interface Scored { entry: WatchlistEntry; stats: YieldStats }

/**
 * Tab 2 — ranks watched tickers by where today's yield sits inside their own
 * history, richest first. A ticker with no stored yield history cannot be ranked
 * and is counted out at the bottom rather than dropped silently.
 */
export default function YieldTargetTab({
  entries, tagNames, activeTag, onTag, timeframe, onTimeframe,
  threshold, onThreshold, expanded, onExpand, onTarget,
}: Props) {
  const { scored, unranked } = useMemo(() => {
    const ranked: Scored[] = [];
    let missing = 0;
    entries.forEach((entry) => {
      const stats = yieldStats(entry, timeframe);
      if (stats) ranked.push({ entry, stats });
      else missing += 1;
    });
    ranked.sort((a, b) => b.stats.percentile - a.stats.percentile);
    return { scored: ranked, unranked: missing };
  }, [entries, timeframe]);

  const passing = scored.filter((row) => row.stats.percentile >= threshold);
  const atTarget = entries.filter((e) => e.atTarget).length;
  const avgPremium = scored.length
    ? scored.reduce((sum, row) => sum + row.stats.vsMedian, 0) / scored.length
    : 0;

  const exportCsv = () => {
    const header = ['Ticker', 'Name', 'Currency', 'Price', 'ForwardYield', `Median_${timeframe}`,
      'VsMedianPct', 'Percentile', 'TargetYield', 'BuyBelow', 'ToTargetPct'];
    const rows = passing.map(({ entry, stats }) => [
      entry.ticker, (entry.name ?? '').replace(/[",]/g, ' '), entry.currency ?? '',
      entry.price ?? '', entry.forwardYield ?? '', stats.median.toFixed(2),
      stats.vsMedian.toFixed(1), stats.percentile.toFixed(0),
      entry.targetYield ?? '', entry.buyBelowPrice ?? '', entry.toTargetPercent ?? '',
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `yield-screen-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3.5">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Baseline</span>
        <Segmented options={TF_ORDER} active={timeframe} onChange={onTimeframe} />
        <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Percentile floor</span>
        <Segmented
          options={THRESHOLDS.map((t) => t.label)}
          active={(THRESHOLDS.find((t) => t.value === threshold) ?? THRESHOLDS[0]).label}
          onChange={(label) => onThreshold(THRESHOLDS.find((t) => t.label === label)?.value ?? 0)}
        />
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <Chip label={ALL_TAGS} active={activeTag === ALL_TAGS} onClick={() => onTag(ALL_TAGS)} />
          {tagNames.map((tag) => (
            <Chip key={tag} label={`#${tag}`} active={activeTag === tag} onClick={() => onTag(tag)} />
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-700">
          <Kpi
            label="At target yield"
            value={String(atTarget)}
            sub="price has reached your buy level"
            valueClass={atTarget ? 'text-green-600 dark:text-green-400' : undefined}
          />
          <Kpi
            label={threshold ? `Above ${threshold}th pct` : 'Ranked tickers'}
            value={String(threshold ? passing.length : scored.length)}
            sub={`of ${scored.length} screened · ${timeframe} baseline`}
          />
          <Kpi
            label="Avg premium to median"
            value={signedPercent(scored.length ? avgPremium : null, 1)}
            sub={`yield vs its own ${timeframe} median`}
            valueClass={avgPremium >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}
          />
          <Kpi
            label="Richest vs history"
            value={scored.length ? scored[0].entry.ticker : '—'}
            sub={scored.length
              ? `${percent(scored[0].stats.current)} · ${scored[0].stats.percentile.toFixed(0)}th pct`
              : 'nothing ranked'}
          />
        </div>
      </div>

      {/* ranked table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
            {threshold ? `Trading at or above the ${threshold}th percentile` : 'All ranked tickers, richest yield first'}
          </span>
          <span className="text-[12px] text-slate-500 dark:text-slate-400">
            {timeframeLabel(timeframe)} · monthly trailing-yield observations
          </span>
          <div className="flex-1" />
          <button
            onClick={exportCsv}
            disabled={passing.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-45"
          >
            <Download className="h-3.5 w-3.5" /> Export screen
          </button>
        </div>

        {passing.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <Filter className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
            </div>
            <div className="text-[13.5px] font-semibold text-slate-600 dark:text-slate-300">
              {scored.length === 0 ? 'Nothing to rank yet' : `Nothing above the ${threshold}th percentile`}
            </div>
            <p className="mx-auto mt-1.5 max-w-[420px] text-[12px] leading-relaxed text-slate-400 dark:text-slate-500">
              {scored.length === 0
                ? 'Ranking needs monthly price history and at least a year of dividends. Refresh a watched ticker to fetch both.'
                : `No watched ticker is that cheap on a ${timeframe} yield basis right now. Loosen the floor, widen the baseline, or wait — the screen re-runs on every price update.`}
            </p>
            {scored.length > 0 && (
              <button
                onClick={() => onThreshold(75)}
                className="mt-4 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Drop floor to 75th
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} w-[34px]`}> </th>
                  <th className={`${TH} text-left w-[196px]`}>Ticker</th>
                  <th className={`${TH} text-right`}>Fwd yield</th>
                  <th className={`${TH} text-right`}>Median {timeframe}</th>
                  <th className={`${TH} text-right`}>vs median</th>
                  <th className={`${TH} text-left w-[200px]`}>Yield percentile</th>
                  <th className={`${TH} text-right w-[64px]`}>Pctile</th>
                  <th className={`${TH} text-center w-[108px]`}>Target</th>
                  <th className={`${TH} text-right`}>Buy below</th>
                  <th className={`${TH} text-right`}>To target</th>
                  <th className={`${TH} text-left w-[86px]`}>Signal</th>
                </tr>
              </thead>
              <tbody>
                {passing.map(({ entry, stats }) => {
                  const open = expanded === entry.ticker;
                  return (
                    <Fragment key={entry.ticker}>
                      <tr
                        onClick={() => onExpand(open ? null : entry.ticker)}
                        className={`cursor-pointer border-t border-slate-100 dark:border-slate-700 ${
                          entry.atTarget
                            ? 'bg-green-50/60 dark:bg-green-500/10'
                            : open ? 'bg-slate-50 dark:bg-slate-700/40' : ''
                        }`}
                      >
                        <td className={`${TD} text-slate-400`}>
                          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </td>
                        <td className={TD}><TickerCell entry={entry} /></td>
                        <td className={`${TD} text-right tabular-nums font-bold text-slate-900 dark:text-white`}>
                          {percent(stats.current)}
                        </td>
                        <td className={`${TD} text-right tabular-nums text-slate-500 dark:text-slate-400`}>
                          {percent(stats.median)}
                        </td>
                        <td className={`${TD} text-right tabular-nums font-semibold ${
                          stats.vsMedian >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                        }`}>
                          {signedPercent(stats.vsMedian, 1)}
                        </td>
                        <td className={TD}>
                          <div className="flex items-center gap-2.5">
                            <YieldStrip stats={stats} width={132} threshold={threshold || 90} />
                            <span className="text-[10.5px] tabular-nums text-slate-400 dark:text-slate-500">
                              {stats.min.toFixed(1)}–{stats.max.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className={`${TD} text-right`}><PercentileCell percentile={stats.percentile} /></td>
                        <td className={`${TD} text-center`} onClick={(e) => e.stopPropagation()}>
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
                        <td className={TD}><SignalCell entry={entry} percentile={stats.percentile} /></td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={11} className="p-0 border-t border-slate-100 dark:border-slate-700">
                            <Detail
                              entry={entry}
                              stats={stats}
                              timeframe={timeframe}
                              threshold={threshold}
                              onTarget={onTarget}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {(passing.length < scored.length || unranked > 0) && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 text-[12px] text-slate-500 dark:text-slate-400">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            {passing.length < scored.length && (
              <span>
                {scored.length - passing.length} watched {scored.length - passing.length === 1 ? 'ticker sits' : 'tickers sit'} below
                the {threshold}th percentile.{' '}
                <button onClick={() => onThreshold(0)} className="font-semibold text-indigo-600 dark:text-indigo-400">Show all</button>
              </span>
            )}
            {unranked > 0 && (
              <span>
                {unranked} {unranked === 1 ? 'ticker has' : 'tickers have'} no stored yield history and cannot be ranked.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, valueClass }: {
  label: string; value: string; sub: string; valueClass?: string;
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</div>
      <div className={`mt-1.5 text-[24px] font-bold tabular-nums tracking-tight ${valueClass ?? 'text-slate-900 dark:text-white'}`}>
        {value}
      </div>
      <div className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-400">{sub}</div>
    </div>
  );
}

function Detail({ entry, stats, timeframe, threshold, onTarget }: {
  entry: WatchlistEntry; stats: YieldStats; timeframe: Timeframe; threshold: number;
  onTarget: (ticker: string, targetYield: number) => void;
}) {
  const bandValue = percentileYield(stats, Math.max(threshold, 1));
  const row = (label: string, value: string, valueClass?: string) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-slate-700">
      <span className="text-[12px] text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-[13px] font-bold tabular-nums ${valueClass ?? 'text-slate-900 dark:text-white'}`}>{value}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 px-5 py-4 bg-slate-50 dark:bg-slate-900/40">
      <div>
        <div className="flex flex-wrap items-center gap-3.5 mb-1.5">
          <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
            {entry.ticker} trailing yield · {timeframeLabel(timeframe)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
            <span className="h-[3px] w-3.5 rounded-sm bg-slate-400" /> median
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
            <span className="h-2 w-3.5 bg-slate-300 dark:bg-slate-600" /> 25th–75th
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
            <span className="h-[3px] w-3.5 rounded-sm bg-green-500" /> {threshold || 90}th pct
          </span>
        </div>
        <YieldHistoryChart stats={stats} targetYield={entry.targetYield} threshold={threshold || 90} />
      </div>

      <div>
        {row('Forward yield today', percent(stats.current))}
        {row(`Median (${timeframe})`, percent(stats.median))}
        {row('25th – 75th percentile', `${stats.p25.toFixed(2)} – ${stats.p75.toFixed(2)}%`, 'text-slate-500 dark:text-slate-400')}
        {row(`${threshold || 90}th percentile`, percent(bandValue), 'text-green-600 dark:text-green-400')}
        {row(`Range (${timeframe})`, `${stats.min.toFixed(2)} – ${stats.max.toFixed(2)}%`, 'text-slate-500 dark:text-slate-400')}
        {row('Premium to median', signedPercent(stats.vsMedian, 1),
          stats.vsMedian >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400')}
        {row('Your target / buy below',
          `${percent(entry.targetYield)} · ${money(entry.buyBelowPrice, entry)}`, 'text-indigo-600 dark:text-indigo-400')}

        <button
          onClick={() => onTarget(entry.ticker, Number(bandValue.toFixed(2)))}
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
        >
          <Target className="h-3.5 w-3.5" /> Target = {threshold || 90}th pct
        </button>

        <p className="mt-3 text-[11.5px] leading-relaxed text-slate-400 dark:text-slate-500">
          {entry.targetYield != null && stats.median > 0
            ? `Buying at ${entry.targetYield.toFixed(2)}% locks in ${(entry.targetYield / stats.median).toFixed(2)}× the yield a ${timeframe} median buyer got.`
            : 'Set a target to see how it compares with what buyers historically got.'}
        </p>
      </div>
    </div>
  );
}
