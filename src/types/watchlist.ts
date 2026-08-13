/** One monthly observation of the trailing-twelve-month yield. */
export interface YieldPoint {
  /** 'YYYY-MM' */
  month: string;
  /** percent */
  yield: number;
}

/**
 * A watched ticker. Every money figure is in `currency` — the API never converts
 * (see the currency rule in CLAUDE.md), and yields are ratios, so they need none.
 */
export interface WatchlistEntry {
  ticker: string;
  name: string | null;
  currency: string | null;
  sector: string | null;

  price: number | null;
  priceYesterday: number | null;
  dayChangePercent: number | null;

  forwardDividend: number | null;
  dividendFrequency: string | null;
  forwardYield: number | null;

  targetYield: number | null;
  buyBelowPrice: number | null;
  /** Percent move from price to buyBelowPrice — negative means the price must fall. */
  toTargetPercent: number | null;
  atTarget: boolean;

  exDividendDate: string | null;
  addedAt: string | null;
  priceUpdatedAt: string | null;
  held: boolean;

  /** Oldest first, up to 240 months. Empty when the ticker has no dividend or price history. */
  yieldHistory: YieldPoint[];
}

export interface TickerSuggestion {
  ticker: string;
  name: string | null;
  sector: string | null;
  currency: string | null;
  price: number | null;
  forwardYield: number | null;
  watched: boolean;
}
