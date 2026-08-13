import type { WatchlistEntry, YieldPoint } from '../../types/watchlist';

export type Timeframe = '1Y' | '3Y' | '5Y' | '10Y' | 'All';

export const TF_ORDER: Timeframe[] = ['1Y', '3Y', '5Y', '10Y', 'All'];
export const TF_MONTHS: Record<Timeframe, number> = {
  '1Y': 12, '3Y': 36, '5Y': 60, '10Y': 120, All: Number.POSITIVE_INFINITY,
};

/** Percentile floors offered by the Yield Target screen. */
export const THRESHOLDS = [
  { label: 'Any', value: 0 },
  { label: '50th', value: 50 },
  { label: '75th', value: 75 },
  { label: '90th', value: 90 },
  { label: '95th', value: 95 },
  { label: '98th', value: 98 },
] as const;

/** Linear-interpolated quantile of an ascending list — mirrors the backend's. */
export function quantile(ascending: number[], q: number): number {
  if (ascending.length === 0) return 0;
  const i = (ascending.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return ascending[lo] + (ascending[hi] - ascending[lo]) * (i - lo);
}

export interface YieldStats {
  /** The timeframe slice, oldest first. */
  window: YieldPoint[];
  /** Today's forward yield — the level being ranked, not part of the window. */
  current: number;
  min: number;
  max: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  /** Share of the window's months at or below today's yield, 0–100. */
  percentile: number;
  /** Today's yield as a percent premium over the window median. */
  vsMedian: number;
}

/**
 * Where today's forward yield sits inside the ticker's own history.
 *
 * The window is trailing-twelve-month yields (what a buyer in that month was
 * actually being paid); today's figure is the forward yield. Ranking one against
 * the other is the standard comparison — it answers "is this cheap for this
 * company", not "is the payout about to change".
 *
 * Null when there is no history to rank against, or no current yield at all.
 */
export function yieldStats(entry: WatchlistEntry, tf: Timeframe): YieldStats | null {
  const history = entry.yieldHistory ?? [];
  const current = entry.forwardYield;
  if (history.length === 0 || current == null) return null;

  const months = TF_MONTHS[tf];
  const window = Number.isFinite(months) ? history.slice(Math.max(0, history.length - months)) : history;
  if (window.length === 0) return null;

  const sorted = window.map((p) => p.yield).sort((a, b) => a - b);
  const median = quantile(sorted, 0.5);
  const below = sorted.filter((v) => v <= current).length;

  return {
    window,
    current,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p25: quantile(sorted, 0.25),
    median,
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
    percentile: (below / sorted.length) * 100,
    vsMedian: median > 0 ? ((current - median) / median) * 100 : 0,
  };
}

/** The yield level at a given percentile of the window. */
export function percentileYield(stats: YieldStats, percentile: number): number {
  const sorted = stats.window.map((p) => p.yield).sort((a, b) => a - b);
  return quantile(sorted, Math.max(percentile, 1) / 100);
}

export function ordinal(n: number): string {
  const v = Math.round(n);
  const teens = v % 100;
  if (teens >= 11 && teens <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][v % 10] ?? 'th';
}

/** Months → a readable span label for chart axes and copy. */
export function timeframeLabel(tf: Timeframe): string {
  return tf === 'All' ? 'all recorded' : `last ${tf}`;
}

export function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
