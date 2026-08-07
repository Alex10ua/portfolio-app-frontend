export type PerformancePeriod = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

// currency code → realized P&L in that currency (major units)
export type RealizedPnLByCurrency = Record<string, number>;

export interface PerformancePoint {
  date: string;
  /** unconverted sum of the natives below — only exact for a mono-currency portfolio */
  portfolioValue: number;
  /** native currency (as quoted, e.g. "GBp") → value in it; convert client-side */
  valueByCurrency?: Record<string, number>;
}

export interface PerformanceData {
  totalInvested: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  realizedPnL: number;
  totalDividends: number;
  totalReturn: number;
  totalReturnPct: number;
  xirr: number;
  timeSeries: PerformancePoint[];
}
