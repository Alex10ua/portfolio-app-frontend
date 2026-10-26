export type PerformancePeriod = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

// currency code → realized P&L in its native units (GBp/GBx remain pence)
export type RealizedPnLByCurrency = Record<string, number>;

/** Lean P&L breakdown, without loading price histories. All commissions are already in P&L. */
export interface PnlSummary {
  realizedPnLByCurrency: RealizedPnLByCurrency;
  commissionsByCurrency: Record<string, number>;
  realizedCommissionsByCurrency: Record<string, number>;
}

export interface PerformancePoint {
  date: string;
  /** unconverted sum of the natives below — only exact for a mono-currency portfolio */
  portfolioValue: number;
  /** native currency (as quoted, e.g. "GBp") → value in it; convert client-side */
  valueByCurrency?: Record<string, number>;
  /** Legacy history lacks dividend-unadjusted closes for these held tickers. */
  estimatedPriceTickers?: string[];
}

/** One BUY (negative), SELL or DIVIDEND (positive), as booked. */
export interface PerformanceCashFlow {
  date: string;
  amount: number;
  currency: string;
}

export interface PerformanceData {
  /**
   * The scalars are the ...ByCurrency maps below summed with no FX — only exact when every
   * amount shares one currency. Convert the maps instead (see summarizePerformance).
   */
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
  /** BUY cost + commission, per transaction currency */
  totalInvestedByCurrency?: Record<string, number>;
  /** open positions at the latest price, per quote currency (may be "GBp") */
  currentValueByCurrency?: Record<string, number>;
  /** remaining FIFO purchase cost including commissions, per original book currency */
  openCostBasisByCurrency?: Record<string, number>;
  /** FIFO realized proceeds/cost in their original currencies — same figure as /realizedPnL */
  realizedPnLByCurrency?: Record<string, number>;
  /** DIVIDEND transactions, per transaction currency */
  totalDividendsByCurrency?: Record<string, number>;
  totalCommissions?: number;
  /** All BUY/SELL commissions in their original currencies, already deducted from P&L. */
  commissionsByCurrency?: Record<string, number>;
  /** Commissions allocated to matched sales; the remainder belongs to open positions. */
  realizedCommissionsByCurrency?: Record<string, number>;
  /** every BUY/SELL/DIVIDEND, for an XIRR in the display currency */
  cashFlows?: PerformanceCashFlow[];
}
