export type PerformancePeriod = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

// currency code → realized P&L in that currency (major units)
export type RealizedPnLByCurrency = Record<string, number>;

export interface PerformancePoint {
  date: string;
  portfolioValue: number;
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
