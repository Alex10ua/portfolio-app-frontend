export interface MarketData {
  ticker: string;
  name: string | null;
  price: number | null;
  /**
   * Quote currency of `price` — **not** the holding's transaction currency. A
   * London listing quotes `"GBp"` (pence) while the holding is booked in `"GBP"`,
   * so anything reusing this price must convert (`toMajorUnits`) first.
   */
  currency: string | null;
  country: string | null;
  sector: string | null;
  industry: string | null;
}

/**
 * Yahoo key statistics (marketData.statistics), mirrors the Java MarketStatistics
 * model. Every field is optional: an absent key means the provider doesn't report
 * that metric for this ticker — never treat it as 0.
 * Yahoo's scaling is inconsistent, so check before formatting: margins, growth and
 * returns are fractions (0.3934 = 39.34%, multiply by 100), while `dividendYield`,
 * `fiveYearAvgDividendYield` and `debtToEquity` already arrive as percentages
 * (0.93 = 0.93%, 30.27 = 30.27%).
 */
export interface MarketStatistics {
  // Fiscal year
  fiscalYearEnd?: string;
  mostRecentQuarter?: string;
  /**
   * Currency of the statement figures (revenue, grossProfit, ebitda, cash flow, totalCash…).
   * Not the quote currency: ULVR.L is quoted in GBp and reports in EUR.
   */
  financialCurrency?: string;

  // Profitability
  profitMargin?: number;
  operatingMargin?: number;
  grossMargin?: number;
  ebitdaMargin?: number;

  // Management effectiveness
  returnOnAssets?: number;
  returnOnEquity?: number;

  // Income statement (ttm)
  revenue?: number;
  revenuePerShare?: number;
  revenueGrowth?: number;
  grossProfit?: number;
  ebitda?: number;
  netIncomeToCommon?: number;
  dilutedEps?: number;
  forwardEps?: number;
  earningsQuarterlyGrowth?: number;
  earningsGrowth?: number;

  // Balance sheet (mrq)
  totalCash?: number;
  totalCashPerShare?: number;
  totalDebt?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  bookValuePerShare?: number;

  // Cash flow (ttm)
  operatingCashflow?: number;
  freeCashflow?: number;

  // Valuation measures
  marketCap?: number;
  enterpriseValue?: number;
  trailingPE?: number;
  forwardPE?: number;
  pegRatio?: number;
  priceToSales?: number;
  priceToBook?: number;
  enterpriseToRevenue?: number;
  enterpriseToEbitda?: number;

  // Trading / price stats
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekChange?: number;
  sp500FiftyTwoWeekChange?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  volume?: number;
  averageVolume?: number;
  averageVolume10days?: number;

  // Share statistics
  sharesOutstanding?: number;
  impliedSharesOutstanding?: number;
  floatShares?: number;
  sharesShort?: number;
  sharesShortPriorMonth?: number;
  shortRatio?: number;
  shortPercentOfFloat?: number;
  heldPercentInsiders?: number;
  heldPercentInstitutions?: number;

  // Dividends & splits
  dividendRate?: number;
  dividendYield?: number;
  trailingAnnualDividendRate?: number;
  trailingAnnualDividendYield?: number;
  fiveYearAvgDividendYield?: number;
  payoutRatio?: number;
  exDividendDate?: string;
  nextDividendDate?: string;
  lastSplitFactor?: string;
  lastSplitDate?: string;

  // Analyst view
  targetHighPrice?: number;
  targetLowPrice?: number;
  targetMeanPrice?: number;
  recommendationMean?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;

  // Company profile
  fullTimeEmployees?: number;
  exchange?: string;
  quoteType?: string;
  website?: string;

  /** When the snapshot was fetched, not a reported figure. */
  updatedAt?: string;

  /** Currency of the monetary figures — may be "GBp" (pence). Filled server-side from marketData.currency. */
  currency?: string;
}

export interface DividendEvent {
  dividendDate: string;
  dividendAmount: number;
  exDividendDate?: string | null;
}

export interface SplitEvent {
  splitDate: string;
  ratioSplit: number;
}

/** Share count as of a date. Sparse — points exist only where the count changed. */
export interface SharesHistoryEntry {
  date: string;
  shares: number;
}

/** Historical page payload; lists are date-ascending and never null. */
export interface TickerHistoricalData {
  ticker: string;
  name: string | null;
  /** Currency of the dividend amounts — may be "GBp" (pence), unlike the transaction currency. */
  currency: string | null;
  dividends: DividendEvent[];
  splits: SplitEvent[];
  sharesHistory: SharesHistoryEntry[];
}

/** One period of a statement line item. */
export interface StatementEntry {
  /** Period end, 'YYYY-MM-DD'. */
  date: string;
  value: number;
}

/** Line-item key (TotalRevenue, GrossProfit, FreeCashFlow, …) → date-ascending series. */
export type Statement = Record<string, StatementEntry[]>;

export interface Statements {
  income?: Statement | null;
  /** Annual only — Yahoo has no trailing balance sheet. */
  balanceSheet?: Statement | null;
  cashFlow?: Statement | null;
}

/**
 * Yahoo financial statements (yahooFinancials), every line item Yahoo publishes.
 * All amounts are in `currency`, the company's **reporting** currency — not the
 * quote currency, so convert before comparing with a price.
 */
export interface YahooFinancials {
  ticker: string;
  /** Yahoo's financialCurrency; null when Yahoo did not say. */
  currency: string | null;
  /** Last 4–5 fiscal years. */
  annual?: Statements | null;
  /** Trailing twelve months, one period per item. Yahoo leaves gaps (no TTM DilutedEPS for MSFT). */
  trailing?: Statements | null;
  updatedAt?: string;
  checkedAt?: string;
}
