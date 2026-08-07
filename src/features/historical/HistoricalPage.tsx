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

  const counts = [...byYear.values()].map((r) => r.count);
  const cadence = counts.length ? Math.max(...counts) : 0;
  const currentYear = new Date().getFullYear();

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

/**
 * Share count over time. The series is SPARSE — a point exists only where the
 * count changed — so the line steps and holds; interpolating would invent a
 * gradual trend that never happened. Dots mark the real filings.
 */
function SharesChart({ points, splits, falling }: {
  points: SharesHistoryEntry[]; splits: SplitEvent[]; falling: boolean;
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
          formatter={(v: number) => [v.toLocaleString('en-US'), 'Shares']}
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
  const sharesHistory = (data?.sharesHistory ?? []).filter((p) => msOf(p.date) >= cutoff);

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
  const shareLabel = active.assetType === 'CRYPTO' ? 'Circulating supply' : 'Shares outstanding';
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
                    : `${sharesHistory.length} reported changes · ${yearOf(sharesHistory[0].date)} → ${yearOf(sharesHistory[sharesHistory.length - 1].date)}`
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
                    Sparse by design — a point exists only where the count changed ({sharesHistory.length} in{' '}
                    {Math.max(1, yearOf(sharesHistory[sharesHistory.length - 1].date) - yearOf(sharesHistory[0].date))} years).
                    The line steps and holds; dots mark real filings. Flat stretches mean "no reported change", not "no data".
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
