import type { FxRates } from '../types/fxRate';
import type { PerformanceCashFlow, PerformanceData } from '../types/performance';
import { convert, convertMap } from './currency';

export interface PerformanceSummary {
  totalInvested: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  realizedPnL: number;
  totalDividends: number;
  totalReturn: number;
  totalReturnPct: number;
  /** null when the cash flows give no solution (e.g. a single flow) */
  xirr: number | null;
  /** false when the API predates the per-currency maps and the native scalars are shown as-is */
  converted: boolean;
}

/**
 * The Performance page's summary in one currency. The API sends each figure as a
 * {currency: amount} map — value in the quote currency, cost in the book currency, which
 * differ for a coin bought in EUR and priced in USD or a London line priced in pence — so
 * every map is converted before anything is added or subtracted. Past cash flows are
 * converted at today's rates: the app keeps no historical FX, so XIRR in a mixed portfolio
 * is an approximation, but it no longer adds dollars to euros.
 */
export function summarizePerformance(data: PerformanceData, baseCurrency: string, rates: FxRates): PerformanceSummary {
  if (!data.currentValueByCurrency || !data.openCostBasisByCurrency) {
    return {
      totalInvested: data.totalInvested,
      currentValue: data.currentValue,
      unrealizedPnL: data.unrealizedPnL,
      unrealizedPnLPct: data.unrealizedPnLPct,
      realizedPnL: data.realizedPnL,
      totalDividends: data.totalDividends,
      totalReturn: data.totalReturn,
      totalReturnPct: data.totalReturnPct,
      xirr: data.xirr,
      converted: false,
    };
  }

  const toBase = (byCurrency: Record<string, number> | undefined) => convertMap(byCurrency, baseCurrency, rates);
  const totalInvested = toBase(data.totalInvestedByCurrency);
  const currentValue = toBase(data.currentValueByCurrency);
  const openCost = toBase(data.openCostBasisByCurrency);
  const realizedPnL = toBase(data.realizedPnLByCurrency);
  const totalDividends = toBase(data.totalDividendsByCurrency);

  const unrealizedPnL = currentValue - openCost;
  const totalReturn = unrealizedPnL + realizedPnL + totalDividends;

  const flows = (data.cashFlows ?? []).map((f) => ({
    date: f.date,
    amount: convert(Number(f.amount) || 0, f.currency, baseCurrency, rates),
  }));
  flows.push({ date: todayIso(), amount: currentValue });

  return {
    totalInvested,
    currentValue,
    unrealizedPnL,
    unrealizedPnLPct: openCost !== 0 ? (unrealizedPnL / openCost) * 100 : 0,
    realizedPnL,
    totalDividends,
    totalReturn,
    totalReturnPct: totalInvested !== 0 ? (totalReturn / totalInvested) * 100 : 0,
    xirr: (data.cashFlows ?? []).length > 0 ? xirrPercent(flows) : 0,
    converted: true,
  };
}

/**
 * Money-weighted annual return, in percent — Newton's method, the same iteration the
 * backend's calcXirr runs, so a single-currency portfolio gets the same figure from both.
 */
export function xirrPercent(flows: Pick<PerformanceCashFlow, 'date' | 'amount'>[]): number | null {
  if (flows.length < 2) return null;
  const points = flows
    .map((f) => ({ t: dayNumber(f.date), amount: f.amount }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.amount))
    .sort((a, b) => a.t - b.t);
  if (points.length < 2) return null;

  const t0 = points[0].t;
  let r = 0.1;
  for (let i = 0; i < 200; i++) {
    let npv = 0;
    let dnpv = 0;
    for (const p of points) {
      const t = (p.t - t0) / 365;
      const denom = Math.pow(1 + r, t);
      npv += p.amount / denom;
      dnpv -= (t * p.amount) / ((1 + r) * denom);
    }
    if (Math.abs(dnpv) < 1e-12) break;
    const next = r - npv / dnpv;
    if (!Number.isFinite(next)) return null;
    if (Math.abs(next - r) < 1e-8) {
      r = next;
      break;
    }
    r = Math.max(next, -0.9999);
  }
  return r * 100;
}

/** Days since the epoch for a 'YYYY-MM-DD' string, read off the string — no timezone shift. */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}
