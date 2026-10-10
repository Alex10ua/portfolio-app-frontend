import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Coins, History, Info, Network, PieChart, RefreshCw, Ghost } from 'lucide-react';
import { useHoldings } from '../../hooks/useHoldings';
import { useTickerHistorical, useRefreshHistorical } from '../../hooks/useMarketData';
import { useTheme } from '../../hooks/useTheme';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import TickerSelector from '../../components/ui/TickerSelector';
import type { Holding } from '../../types/holding';
import type { DividendEvent, SharesHistoryEntry, SplitEvent } from '../../types/marketData';

type Range = '5Y' | '10Y' | 'ALL';

// ---------- FORMATTERS ----------
const yearOf = (d: string) => Number(d.slice(0, 4));
const msOf = (d: string) => new Date(`${d}T00:00:00`).getTime();

function fmtAmount(v: number, currency: string | null): string {
  // GBp/GBx are pence — the minor unit, not pounds (see CLAUDE.md currency rule)
  if (currency === 'GBp' || currency === 'GBx') return `${v.toFixed(v < 10 ? 2 : 0)}p`;
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
  const sym = symbols[currency ?? 'USD'] ?? `${currency ?? ''} `;
  return `${sym}${v.toFixed(v < 10 ? 2 : 0)}`;
}

function fmtShares(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return v.toLocaleString('en-US');
}

function fmtDay(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtMonth(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** ratioSplit 2 → "2:1", 1.5 → "3:2". */
function fmtRatio(r: number): string {
  if (Number.isInteger(r)) return `${r}:1`;
  const twice = r * 2;
  if (Number.isInteger(twice)) return `${twice}:2`;
  return `${r.toFixed(2)}:1`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---------- YEARLY AGGREGATION ----------
interface YearRow { year: number; count: number; total: number; partial: boolean; yoy: number | null }

/** Finished years that vote on the usual payment count — see usualCadence. */
const CADENCE_WINDOW_YEARS = 5;

/**
 * The ticker's usual payments per year: the most common count among the last
 * CADENCE_WINDOW_YEARS finished years (the running year never votes), a tie
 * going to the higher count. Not the maximum — one stray extra payment (KO's
 * 2001 holds a fifth, a pre-split duplicate from Yahoo) made every normal year
 * read as short, so all of them went partial and the growth columns blank.
 * Same rule as AiTickerAssembler.usualCadence.
 */
function usualCadence(counts: Map<number, number>, currentYear: number): number {
  const finished = [...counts.entries()]
    .filter(([y]) => y < currentYear)
    .sort((a, b) => b[0] - a[0])
    .slice(0, CADENCE_WINDOW_YEARS)
    .map(([, c]) => c);
  const votes = finished.length ? finished : [...counts.values()];
  const tally = new Map<number, number>();
  votes.forEach((c) => tally.set(c, (tally.get(c) ?? 0) + 1));
  let cadence = 0;
  let most = 0;
  tally.forEach((n, c) => {
    if (n > most || (n === most && c > cadence)) {
      cadence = c;
      most = n;
    }
  });
  return cadence;
}

/**
 * Per-year dividend totals. A year holding fewer payments than the ticker's usual
 * cadence is INCOMPLETE — the year in progress, or the first year of a policy —
 * so it gets no YoY and is skipped by the streak scan. Without that, a
 * half-collected current year reads as a ~50% dividend cut.
 */
function aggregateYears(payments: DividendEvent[]): YearRow[] {
  const byYear = new Map<number, { count: number; total: number }>();
  payments.forEach((p) => {
    const y = yearOf(p.dividendDate);
    const row = byYear.get(y) ?? { count: 0, total: 0 };
    row.count += 1;
    row.total += p.dividendAmount;
    byYear.set(y, row);
  });

  const currentYear = new Date().getFullYear();
  const cadence = usualCadence(new Map([...byYear].map(([y, r]) => [y, r.count])), currentYear);

  const rows: YearRow[] = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, r]) => ({
      year,
      count: r.count,
      total: r.total,
      partial: year === currentYear || r.count < cadence,
      yoy: null,
    }));

  const full = rows.filter((r) => !r.partial);
  full.forEach((r, i) => {
    const prev = full[i - 1];
    r.yoy = prev && prev.total > 0 ? (r.total / prev.total - 1) * 100 : null;
  });
  return rows;
}

function lastRaise(payments: DividendEvent[]) {
  for (let i = payments.length - 1; i > 0; i--) {
    if (payments[i].dividendAmount > payments[i - 1].dividendAmount + 1e-9) {
      return {
        pct: (payments[i].dividendAmount / payments[i - 1].dividendAmount - 1) * 100,
        date: payments[i].dividendDate,
        from: payments[i - 1].dividendAmount,
        to: payments[i].dividendAmount,
      };
    }
  }
  return null;
}

function growthStreak(years: YearRow[]): number {
  const full = years.filter((r) => !r.partial);
  let streak = 0;
  for (let i = full.length - 1; i > 0; i--) {
    if (full[i].total > full[i - 1].total) streak++;
    else break;
  }
  return streak;
}

// ---------- SECTION SHELL ----------
function Section({ icon: Icon, title, sub, right, children }: {
  icon: typeof Coins; title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4.5 py-3.5 border-b border-slate-100 dark:border-slate-700" style={{ paddingLeft: 18, paddingRight: 18 }}>
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-500/20">
          <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</div>
          {sub && <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function SectionEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
        <Ghost className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
      </div>
      <div className="text-[13.5px] font-semibold text-slate-500 dark:text-slate-400">{title}</div>
      <p className="mx-auto mt-1.5 max-w-[340px] text-[12px] leading-relaxed text-slate-400 dark:text-slate-500">{body}</p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-4.5 py-2.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400" style={{ paddingLeft: 18, paddingRight: 18 }}>
      <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function MiniStat({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3.5 py-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</div>
      <div className={`mt-1.5 text-[19px] font-bold tabular-nums tracking-tight ${valueClass ?? 'text-slate-900 dark:text-white'}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

function ChartSkeleton({ height }: { height: number }) {
  return <div className="m-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" style={{ height }} />;
}

// ---------- CHARTS ----------
/**
 * Tooltip props for both charts. `contentStyle` alone only themes the label row —
 * recharts paints each ITEM in its series color (the indigo/amber bar fill), so the
 * value line ignored the theme and sat at a different color from the date above it.
 * `itemStyle`/`labelStyle` force both rows to the same theme text color.
 */
function useTooltipProps() {
  const { dark } = useTheme();
  const color = dark ? '#f1f5f9' : '#0f172a';
  return {
    contentStyle: dark
      ? { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12.5, color }
      : { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12.5, color },
    labelStyle: { color, fontWeight: 600 },
    itemStyle: { color },
  };
}

interface DivBar { date: string; amount: number; year: number; clipped: boolean }

/** Payments each side of a bar used for its "normal for this era" reference. */
const LOCAL_WINDOW = 4;

/**
 * Bars + Y-axis top for the dividend chart.
 *
 * A special dividend (the provider gives no flag for them) is many times the
 * regular payment and would flatten decades of the rest, so the axis stops
 * above the largest REGULAR payment and specials clip.
 *
 * "Regular" is judged against a LOCAL median — the payment's own neighbours —
 * not the median of the whole series. A dividend that grew 10× over 30 years
 * leaves every recent payment above 4× the all-time median, so a global cap
 * clipped the entire modern era as "outliers"; growth moves the neighbours too,
 * so a local window only trips on a genuine one-off spike.
 */
function buildDividendBars(payments: DividendEvent[]): { bars: DivBar[]; domainTop: number; clipped: number } {
  const amounts = payments.map((p) => p.dividendAmount);
  const special = amounts.map((v, i) => {
    const local = median(amounts.slice(Math.max(0, i - LOCAL_WINDOW), i + LOCAL_WINDOW + 1));
    return local > 0 && v > local * 4;
  });

  const regular = amounts.filter((_, i) => !special[i]);
  const top = (regular.length ? Math.max(...regular) : Math.max(...amounts)) * 1.15;
  const bars = payments.map((p) => ({
    date: p.dividendDate,
    amount: p.dividendAmount,
    year: yearOf(p.dividendDate),
    clipped: p.dividendAmount > top,
  }));
  return { bars, domainTop: top, clipped: bars.filter((b) => b.clipped).length };
}

/**
 * One bar per payment, with split markers. A per-share amount halves at a 2:1,
 * so the step down at a marker is real data, not a gap.
 */
function DividendChart({ series, splits, currency }: {
  series: { bars: DivBar[]; domainTop: number }; splits: SplitEvent[]; currency: string | null;
}) {
  const { dark } = useTheme();
  const tooltip = useTooltipProps();
  const data = series.bars;
  const domainTop = series.domainTop;

  // splits inside the visible window, snapped to the nearest payment category
  const firstMs = msOf(data[0].date);
  const lastMs = msOf(data[data.length - 1].date);
  const markers = splits
    .filter((s) => msOf(s.splitDate) >= firstMs && msOf(s.splitDate) <= lastMs)
    .map((s) => {
      const nearest = data.reduce((best, d) =>
        Math.abs(msOf(d.date) - msOf(s.splitDate)) < Math.abs(msOf(best.date) - msOf(s.splitDate)) ? d : best,
      data[0]);
      return { x: nearest.date, label: fmtRatio(s.ratioSplit) };
    });

  // one tick per ~6 years so a 30-year series stays readable
  const years = [...new Set(data.map((d) => d.year))];
  const tickStep = Math.max(1, Math.round(years.length / 8));
  const tickDates = new Set(
    years.filter((_, i) => i % tickStep === 0).map((y) => data.find((d) => d.year === y)!.date),
  );

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#334155' : '#e2e8f0'} />
        <XAxis
          dataKey="date" axisLine={false} tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          ticks={[...tickDates]}
          tickFormatter={(d: string) => String(yearOf(d))}
        />
        <YAxis
          axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }}
          domain={[0, domainTop]} allowDataOverflow
          tickFormatter={(v: number) => fmtAmount(v, currency)}
        />
        <Tooltip
          {...tooltip}
          labelFormatter={(d: string) => fmtDay(d)}
          formatter={(v: number, _name, item) => [
            (item?.payload as DivBar | undefined)?.clipped
              ? `${fmtAmount(v, currency)} · taller than the chart, likely a special dividend`
              : fmtAmount(v, currency),
            'Payment',
          ]}
        />
        {markers.map((mk) => (
          <ReferenceLine
            key={mk.x} x={mk.x} stroke="#8B5CF6" strokeDasharray="3 3"
            label={{ value: mk.label, position: 'top', fontSize: 9.5, fill: '#8B5CF6', fontWeight: 700 }}
          />
        ))}
        <Bar dataKey="amount" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.date} fill={d.clipped ? '#F59E0B' : '#4F46E5'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------- SHARE BASIS ----------
interface AdjustedShares extends SharesHistoryEntry {
  /** the count as filed */
  reported: number;
  /** multiplier applied to reach today's basis; 1 = filed in it already */
  factor: number;
  /** fits its neighbours in no share basis — a junk filing, left off the chart */
  outlier: boolean;
}

/**
 * Below this a filed count is a placeholder or a sign error, never a share count:
 * SEC carries 0 (KO, NEE, MRK), 1 (ICE's 2013 holding-company shell, four
 * filings running), 100 and 1,000 (pre-listing shells) and OXY's −891M. Kept low
 * on purpose — ALLY's real 2009 count is 799,120 shares before its 310:1 split.
 */
const MIN_PLAUSIBLE_SHARES = 10_000;
/** A jump costs at most this much, so a junk filing cannot cost more than one bad step. */
const SHARE_JUMP_CAP = Math.log(1.5);
/** Leaving one point out — just under one capped jump, so junk is dropped, not routed around. */
const SHARE_SKIP_COST = 0.8 * SHARE_JUMP_CAP;
/** Reading a filed count as thousands: only when its neighbours clearly say so. */
const THOUSANDS_PENALTY = 0.05;
/** Counts under this may have been filed in thousands (they would be < 100B shares). */
const THOUSANDS_BELOW = 1e8;
/** Tie-break toward the raw (pre-split) reading when nothing else decides. */
const RESTATED_PENALTY = 1e-6;

/**
 * Share counts restated in today's share basis, so a split no longer reads as
 * issuance: KO's 2012 2:1 showed as +85.7% since 2009 when buybacks had cut the
 * count ~7%. Dividends arrive from Yahoo back-scaled the same way, so both
 * sections now speak one basis.
 *
 * A point does NOT simply take every later split. SEC keeps the latest filing
 * per date, and a balance sheet filed after a split restates its prior-period
 * comparative, so restated and raw points interleave: GOOGL 2021-09-30 665M,
 * 2021-12-31 13,242M (already ×20), 2022-03-31 659M. Each point may be restated
 * through any of the splits after it, so its candidate factors are the products
 * of the newest-first suffixes of those splits (×20 raw, ×1 restated). The
 * path through the candidates with the smallest total log jump wins (Viterbi):
 * counts drift a few percent a year while a wrong basis is off by a whole split
 * ratio.
 *
 * SEC also carries junk, handled on the same path:
 * - counts filed in thousands (AAPL 2014-03-29 861,745; C 2009 22.9M for 22.9B;
 *   AWR, CMG, AWK) get each candidate ×1000 as well, at THOUSANDS_PENALTY;
 * - one-off wrong facts (ROL 2016-03-09 at the pre-split level a year after its
 *   split, MA's 2009–10 cover pages counting class A alone) are skipped at SHARE_SKIP_COST and
 *   their neighbours linked directly. Capping jumps alone is not enough: ROL's
 *   junk point made rescaling all earlier history by 1.5 (one jump) cheaper
 *   than the two jumps around it;
 * - anything under MIN_PLAUSIBLE_SHARES never enters the path.
 * Skipped and implausible points come back flagged `outlier`.
 */
function splitAdjustShares(all: SharesHistoryEntry[], splits: SplitEvent[]): AdjustedShares[] {
  const points = all
    .filter((p) => p.shares >= MIN_PLAUSIBLE_SHARES)
    .sort((a, b) => a.date.localeCompare(b.date));
  const n = points.length;
  const asOutlier = (p: SharesHistoryEntry): AdjustedShares =>
    ({ date: p.date, shares: p.shares, reported: p.shares, factor: 1, outlier: true });
  if (n === 0) return all.map(asOutlier);
  const ordered = splits
    .filter((s) => s.ratioSplit > 0)
    .sort((a, b) => a.splitDate.localeCompare(b.splitDate));

  // options[i]: restated through none of the later splits (first, the raw reading) … all
  // of them (×1), then the same again ×1000 when the count may have been filed in thousands.
  // A split dated on the point's own day counts as already applied — same rule as share accumulation.
  const options = points.map((p) => {
    const later = ordered.filter((s) => s.splitDate > p.date);
    const basis = [...later.map((_, k) => later.slice(k).reduce((f, s) => f * s.ratioSplit, 1)), 1]
      .map((factor, k) => ({ factor, penalty: k * RESTATED_PENALTY }));
    return p.shares < THOUSANDS_BELOW
      ? [...basis, ...basis.map((o) => ({ factor: o.factor * 1000, penalty: o.penalty + THOUSANDS_PENALTY }))]
      : basis;
  });
  const value = (i: number, k: number) => points[i].shares * options[i][k].factor;
  const jump = (a: number, b: number) => Math.min(Math.abs(Math.log(a / b)), SHARE_JUMP_CAP);

  // cost[i][k]: cheapest path ending on point i read with option k;
  // from[i][k]: the kept point before it (i-1, or i-2 when i-1 is skipped), null at the start
  const cost: number[][] = [];
  const from: ([number, number] | null)[][] = [];
  for (let i = 0; i < n; i++) {
    cost.push([]);
    from.push([]);
    options[i].forEach((option, k) => {
      // a path may start here, or here with point 0 skipped
      let best = i === 0 ? 0 : i === 1 ? SHARE_SKIP_COST : Infinity;
      let src: [number, number] | null = null;
      for (const [p, extra] of [[i - 1, 0], [i - 2, SHARE_SKIP_COST]] as const) {
        if (p < 0) continue;
        cost[p].forEach((c, j) => {
          const total = c + extra + jump(value(p, j), value(i, k));
          if (total < best) { best = total; src = [p, j]; }
        });
      }
      cost[i].push(best + option.penalty);
      from[i].push(src);
    });
  }

  // the path may also end with the last point skipped
  let at: [number, number] | null = [n - 1, cost[n - 1].indexOf(Math.min(...cost[n - 1]))];
  if (n > 1) {
    const prevBest = Math.min(...cost[n - 2]);
    if (prevBest + SHARE_SKIP_COST < cost[n - 1][at[1]]) at = [n - 2, cost[n - 2].indexOf(prevBest)];
  }
  const kept = new Map<number, number>();
  while (at) {
    kept.set(at[0], at[1]);
    at = from[at[0]][at[1]];
  }

  const fitted = new Map<SharesHistoryEntry, AdjustedShares>(points.map((p, i) => {
    const k = kept.get(i);
    const factor = options[i][k ?? 0].factor;
    return [p, { date: p.date, shares: p.shares * factor, reported: p.shares, factor, outlier: k === undefined }];
  }));
  return all.map((p) => fitted.get(p) ?? asOutlier(p));
}

/**
 * Share count over time, in today's share basis (see splitAdjustShares). The
 * series is SPARSE — a point exists only where the count changed — so the line
 * steps and holds; interpolating would invent a gradual trend that never
 * happened. Dots mark the real filings.
 */
function SharesChart({ points, splits, falling }: {
  points: AdjustedShares[]; splits: SplitEvent[]; falling: boolean;
}) {
  const { dark } = useTheme();
  const tooltip = useTooltipProps();
  const color = falling ? '#14B8A6' : '#F59E0B';
  const values = points.map((p) => p.shares);
  const min = Math.min(...values) * 0.94;
  const max = Math.max(...values) * 1.04;

  const firstMs = msOf(points[0].date);
  const lastMs = msOf(points[points.length - 1].date);
  const markers = splits
    .filter((s) => msOf(s.splitDate) >= firstMs && msOf(s.splitDate) <= lastMs)
    .map((s) => {
      const nearest = points.reduce((best, p) =>
        Math.abs(msOf(p.date) - msOf(s.splitDate)) < Math.abs(msOf(best.date) - msOf(s.splitDate)) ? p : best,
      points[0]);
      return { x: nearest.date, label: fmtRatio(s.ratioSplit) };
    });

  const tickStep = Math.max(1, Math.round(points.length / 6));

  return (
    <ResponsiveContainer width="100%" height={218}>
      <LineChart data={points} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#334155' : '#e2e8f0'} />
        <XAxis
          dataKey="date" axisLine={false} tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          ticks={points.filter((_, i) => i % tickStep === 0).map((p) => p.date)}
          tickFormatter={(d: string) => String(yearOf(d))}
        />
        <YAxis
          axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }}
          domain={[min, max]} tickFormatter={(v: number) => fmtShares(v)}
        />
        <Tooltip
          {...tooltip}
          labelFormatter={(d: string) => fmtDay(d)}
          formatter={(v: number, _name, item: { payload?: AdjustedShares }) => {
            const p = item.payload;
            const filed = p && p.factor !== 1
              ? ` · filed ${p.reported.toLocaleString('en-US')} ×${+p.factor.toFixed(4)}`
              : '';
            return [Math.round(v).toLocaleString('en-US'), `Shares${filed}`];
          }}
        />
        {markers.map((mk) => (
          <ReferenceLine
            key={mk.x} x={mk.x} stroke="#8B5CF6" strokeDasharray="3 3"
            label={{ value: mk.label, position: 'top', fontSize: 9.5, fill: '#8B5CF6', fontWeight: 700 }}
          />
        ))}
        <Line
          type="stepAfter" dataKey="shares" stroke={color} strokeWidth={2}
          dot={{ r: 3, fill: dark ? '#1e293b' : '#fff', stroke: color, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---------- PAGE ----------
export default function HistoricalPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId!;
  const { data: holdings, isLoading, error } = useHoldings(pid);
  const [ticker, setTicker] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('ALL');

  const selectable = useMemo(
    () => (holdings ?? []).filter((h) => h.assetType === 'STOCK' || h.assetType === 'CRYPTO'),
    [holdings],
  );

  useEffect(() => { setTicker(null); }, [pid]);
  useEffect(() => {
    if (!ticker && selectable.length > 0) setTicker(selectable[0].ticker);
  }, [ticker, selectable]);

  const active: Holding | undefined = selectable.find((h) => h.ticker === ticker) ?? selectable[0];
  const { data, isLoading: histLoading, error: histError } = useTickerHistorical(active?.ticker ?? null);
  const refresh = useRefreshHistorical(active?.ticker ?? '');

  const cutoff = range === 'ALL' ? -Infinity : Date.now() - (range === '5Y' ? 5 : 10) * 365.25 * 864e5;
  const allDividends = data?.dividends ?? [];
  const splits = data?.splits ?? [];
  const dividends = allDividends.filter((d) => msOf(d.dividendDate) >= cutoff);
  // restated on the whole series first — a point's basis is read off its neighbours, range or not
  const adjustedShares = useMemo(
    () => splitAdjustShares(data?.sharesHistory ?? [], data?.splits ?? []),
    [data?.sharesHistory, data?.splits],
  );
  const sharesInRange = adjustedShares.filter((p) => msOf(p.date) >= cutoff);
  const sharesHistory = sharesInRange.filter((p) => !p.outlier);
  const outlierShares = sharesInRange.filter((p) => p.outlier);
  const adjustedCount = sharesHistory.filter((p) => p.factor !== 1).length;

  const divSeries = useMemo(() => buildDividendBars(dividends), [dividends]);
  const years = useMemo(() => aggregateYears(allDividends), [allDividends]);
  const shownYears = years.filter((r) => msOf(`${r.year}-12-31`) >= cutoff).reverse();
  const raise = useMemo(() => lastRaise(allDividends), [allDividends]);
  const streak = growthStreak(years);
  const fullYears = years.filter((r) => !r.partial);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading holdings" message={(error as Error).message} />;

  if (!active) {
    return (
      <EmptyState
        icon={History}
        title="No tickers to chart"
        description="Historical shows dividend, split and share-count series per ticker — add a stock or crypto holding to this portfolio first."
      />
    );
  }

  const currency = data?.currency ?? null;
  const currencyMismatch = currency && active.currency && currency !== active.currency;
  // shares outstanding falling = buybacks; crypto reports circulating supply instead
  const shareChange = sharesHistory.length > 1
    ? (sharesHistory[sharesHistory.length - 1].shares / sharesHistory[0].shares - 1) * 100
    : null;
  // crypto's series is live circulating-supply snapshots; a stock's is SEC filings only
  const isCrypto = active.assetType === 'CRYPTO';
  const shareLabel = isCrypto ? 'Circulating supply' : 'Shares outstanding';
  const cumulativeFrom = (i: number) => splits.slice(i).reduce((f, s) => f * s.ratioSplit, 1);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900 dark:text-white">Historical</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            Dividends, splits and share count for {active.ticker}
          </p>
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
          title="Backfills the share-count series from SEC EDGAR filings"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? 'animate-spin' : ''}`} />
          {refresh.isPending ? 'Refreshing…' : 'Refresh from SEC'}
        </button>
      </div>

      {/* toolbar — one range control drives all three sections */}
      <div className="flex flex-wrap items-center gap-4">
        <TickerSelector holdings={selectable} selected={active} onSelect={setTicker} />
        {currencyMismatch && (
          <span className="inline-flex items-center gap-2 text-[11.5px] text-amber-600 dark:text-amber-400">
            <Info className="h-3.5 w-3.5" />
            amounts reported in {currency}{currency === 'GBp' ? ' (pence)' : ''} · not your {active.currency} book
          </span>
        )}
        <div className="flex-1" />
        <span className="text-[11.5px] tabular-nums text-slate-400 dark:text-slate-500">range</span>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 gap-0.5">
          {(['5Y', '10Y', 'ALL'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors ${
                range === r
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {histError ? (
        <ErrorAlert
          title="Couldn't load history"
          message={`${(histError as Error).message}. Dividends, splits and share counts are fetched together, so all three sections are unavailable — stored history is untouched.`}
        />
      ) : (
        <div className="space-y-4">
          {/* ── 1 · DIVIDEND PROGRESSION ── */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-stretch">
            <Section
              icon={Coins}
              title="Dividend progression"
              sub={
                histLoading ? 'loading…'
                  : dividends.length === 0 ? 'no payments on record'
                    : `${dividends.length} payments · ${fmtMonth(dividends[0].dividendDate)} → ${fmtMonth(dividends[dividends.length - 1].dividendDate)}`
              }
              right={!histLoading && dividends.length > 0 ? (
                <div className="hidden sm:flex items-center gap-3.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-indigo-600" /> payment</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-0 w-2.5 border-t-2 border-dashed border-violet-500" /> split</span>
                </div>
              ) : null}
            >
              {histLoading ? (
                <ChartSkeleton height={216} />
              ) : dividends.length === 0 ? (
                <SectionEmpty
                  title="No dividends on record"
                  body={`${active.ticker} has no dividend payments in this range. The section stays empty until the provider reports one — nothing is missing.`}
                />
              ) : (
                <>
                  <div className="pt-3.5 pr-3">
                    <DividendChart series={divSeries} splits={splits} currency={currency} />
                  </div>
                  <Note>
                    Per-payment amounts, as reported. A split halves the per-share amount, so the drop at a marker is real —
                    yearly totals are unaffected.
                    {divSeries.clipped > 0 && (
                      <>
                        {' '}
                        {divSeries.clipped === 1 ? 'One payment is' : `${divSeries.clipped} payments are`} many times the
                        surrounding ones — a special dividend. Charting {divSeries.clipped === 1 ? 'it' : 'them'} in full would
                        squash every regular payment flat, so the axis stops above the largest regular payment and{' '}
                        {divSeries.clipped === 1 ? 'that bar is' : 'those bars are'} cut off in amber; hover for the true amount.
                      </>
                    )}
                  </Note>
                </>
              )}
            </Section>

            {/* right rail — callouts + per-year table */}
            <div className="flex flex-col gap-4">
              {histLoading ? (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <ChartSkeleton height={150} />
                </div>
              ) : dividends.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <div className="text-[12.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">No income history</div>
                  <p className="text-[12px] leading-relaxed text-slate-400 dark:text-slate-500">
                    Growth streak and last-raise callouts appear here once a first payment is reported.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat
                      label="Last raise"
                      value={raise ? `+${raise.pct.toFixed(1)}%` : '—'}
                      valueClass={raise ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}
                      sub={raise
                        ? `${fmtMonth(raise.date)} · ${fmtAmount(raise.from, currency)} → ${fmtAmount(raise.to, currency)}`
                        : 'no increase on record'}
                    />
                    <MiniStat
                      label="Growth streak"
                      value={`${streak} yrs`}
                      sub={streak > 0 && fullYears.length > streak
                        ? `${fullYears[fullYears.length - 1 - streak].year} → ${fullYears[fullYears.length - 1].year}, uninterrupted`
                        : 'flat or cut last full year'}
                    />
                  </div>

                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="flex items-baseline justify-between px-4 pt-3 pb-2.5">
                      <span className="text-[12.5px] font-semibold text-slate-900 dark:text-white">Per year</span>
                      <span className="text-[10.5px] tabular-nums text-slate-400 dark:text-slate-500">
                        {shownYears.length} of {years.length} yrs
                      </span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-white dark:bg-slate-800">
                          <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            <th className="text-left px-4 py-2 font-bold">Year</th>
                            <th className="text-right px-3 py-2 font-bold">Pmts</th>
                            <th className="text-right px-3 py-2 font-bold">Total</th>
                            <th className="text-right px-4 py-2 font-bold">YoY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shownYears.map((r) => (
                            <tr key={r.year} className="border-t border-slate-100 dark:border-slate-700">
                              <td className="px-4 py-1.5 text-[12px] tabular-nums text-slate-900 dark:text-white">
                                {r.year}
                                {r.partial && (
                                  <span className="ml-1.5 text-[9.5px] font-bold tracking-wider text-slate-400 dark:text-slate-500">YTD</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right text-[12px] tabular-nums text-slate-500 dark:text-slate-400">{r.count}</td>
                              <td className="px-3 py-1.5 text-right text-[12px] tabular-nums text-slate-900 dark:text-white">
                                {fmtAmount(r.total, currency)}
                              </td>
                              <td className={`px-4 py-1.5 text-right text-[12px] tabular-nums ${
                                r.yoy == null
                                  ? 'text-slate-400 dark:text-slate-500'
                                  : r.yoy >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                              }`}>
                                {r.yoy == null ? '—' : `${r.yoy >= 0 ? '+' : ''}${r.yoy.toFixed(1)}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── 2 · SPLITS   3 · SHARE COUNT ── */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.35fr] gap-4 items-start">
            <Section
              icon={Network}
              title="Stock splits"
              sub={
                histLoading ? 'loading…'
                  : splits.length === 0 ? 'none on record'
                    : `${splits.length} on record · cumulative ${cumulativeFrom(0).toFixed(cumulativeFrom(0) < 10 ? 1 : 0)}× since ${yearOf(splits[0].splitDate)}`
              }
            >
              {histLoading ? (
                <ChartSkeleton height={140} />
              ) : splits.length === 0 ? (
                <SectionEmpty
                  title="No splits on record"
                  body="Most companies never split, or split before the provider's history begins. Share counts are as-reported, unadjusted."
                />
              ) : (
                <>
                  {/* timeline strip */}
                  <div className="px-5 pt-4 pb-1">
                    <div className="relative h-[30px]">
                      <div className="absolute inset-x-0 top-[14px] h-0.5 bg-slate-200 dark:bg-slate-700" />
                      {splits.map((s) => {
                        const t0 = msOf(splits[0].splitDate);
                        const t1 = msOf(splits[splits.length - 1].splitDate);
                        const left = t1 === t0 ? 50 : ((msOf(s.splitDate) - t0) / (t1 - t0)) * 100;
                        return (
                          <div
                            key={s.splitDate}
                            className="absolute top-2 h-3.5 w-3.5 rounded-full bg-violet-500 border-[3px] border-white dark:border-slate-800"
                            style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                            title={`${fmtDay(s.splitDate)} · ${fmtRatio(s.ratioSplit)}`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10.5px] tabular-nums text-slate-400 dark:text-slate-500">
                      <span>{yearOf(splits[0].splitDate)}</span>
                      <span>{yearOf(splits[splits.length - 1].splitDate)}</span>
                    </div>
                  </div>

                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        <th className="text-left px-4 py-2 font-bold">Date</th>
                        <th className="text-center px-3 py-2 font-bold">Ratio</th>
                        <th className="text-right px-4 py-2 font-bold">Cumulative to today</th>
                      </tr>
                    </thead>
                    <tbody>
                      {splits.slice().reverse().map((s, ri) => {
                        const i = splits.length - 1 - ri;
                        const factor = cumulativeFrom(i);
                        return (
                          <tr key={s.splitDate} className="border-t border-slate-100 dark:border-slate-700">
                            <td className="px-4 py-2 text-[12px] tabular-nums text-slate-900 dark:text-white">{fmtDay(s.splitDate)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="rounded px-2 py-0.5 text-[11.5px] font-bold tabular-nums text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/15">
                                {fmtRatio(s.ratioSplit)}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
                              {factor.toFixed(factor < 10 ? 1 : 0)}×
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <Note>
                    <span className="tabular-nums">ratioSplit: 2</span> means 2:1 — one old share became two. The cumulative factor is the
                    product from that split to today: one {yearOf(splits[0].splitDate)} share is {cumulativeFrom(0).toFixed(cumulativeFrom(0) < 10 ? 1 : 0)} shares now.
                  </Note>
                </>
              )}
            </Section>

            <Section
              icon={PieChart}
              title={shareLabel}
              sub={
                histLoading ? 'loading…'
                  : sharesHistory.length === 0 ? 'not available for this listing'
                    : `${sharesHistory.length} ${isCrypto ? 'reported changes' : 'SEC filings'} · ${yearOf(sharesHistory[0].date)} → ${yearOf(sharesHistory[sharesHistory.length - 1].date)}`
                      + (adjustedCount > 0 ? ' · split-adjusted' : '')
              }
              right={!histLoading && shareChange != null ? (
                <span className={`rounded-md px-2.5 py-1 text-[12.5px] font-bold tabular-nums ${
                  shareChange <= 0
                    ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-500/15'
                    : 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15'
                }`}>
                  {shareChange >= 0 ? '+' : ''}{shareChange.toFixed(1)}% since {yearOf(sharesHistory[0].date)}
                </span>
              ) : null}
            >
              {histLoading ? (
                <ChartSkeleton height={200} />
              ) : sharesHistory.length === 0 ? (
                <SectionEmpty
                  title="No share-count history"
                  body={`Nothing on record for ${active.ticker} in this range. The series comes from SEC filings, so non-US issuers have none — "Refresh from SEC" fills it in where it exists.`}
                />
              ) : (
                <>
                  <div className="pt-3.5 pr-3">
                    <SharesChart points={sharesHistory} splits={splits} falling={(shareChange ?? 0) <= 0} />
                  </div>
                  <Note>
                    {isCrypto
                      ? 'Sparse by design — a point exists only where the supply changed'
                      : 'SEC filings only, no live quotes mixed in — one point per filing'}{' '}
                    ({sharesHistory.length} in{' '}
                    {Math.max(1, yearOf(sharesHistory[sharesHistory.length - 1].date) - yearOf(sharesHistory[0].date))} years).
                    The line steps and holds; dots mark the {isCrypto ? 'recorded changes' : 'filings'}.
                    Flat stretches mean &quot;no reported change&quot;, not &quot;no data&quot;.
                    {adjustedCount > 0 && (
                      <>
                        {' '}Counts are in today&apos;s share basis: {adjustedCount} pre-split{' '}
                        {adjustedCount === 1 ? 'filing is' : 'filings are'} multiplied by the splits after{' '}
                        {adjustedCount === 1 ? 'it' : 'them'}, so a split does not read as issuance. A filing that
                        already restated its figures is left as filed; the tooltip shows the count as filed.
                      </>
                    )}
                    {outlierShares.length > 0 && (
                      <>
                        {' '}Left out: {outlierShares.map((p) => `${fmtDay(p.date)} (${fmtShares(p.reported)})`).join(', ')}
                        {' '}— {outlierShares.length === 1 ? 'a filing' : 'filings'} that fit no share basis next to{' '}
                        {outlierShares.length === 1 ? 'its' : 'their'} neighbours.
                      </>
                    )}
                  </Note>
                </>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
