export type AssetType = 'STOCK' | 'FIGURINE' | 'COIN' | 'FUND' | 'CRYPTO' | 'CUSTOM';

export interface Holding {
  ticker: string;
  assetType: AssetType | null;
  name: string | null;
  shareAmount: number;
  /** unrounded holding quantity; `shareAmount` is 2dp for display. Book SELLs against this. */
  exactShareAmount?: number | null;
  costPerShare: number | null;
  costBasis: number | null;           // backend-computed (BigDecimal): costPerShare × shares
  currentShareValue: number | null;
  currentTotalValue: number | null;   // backend-computed (BigDecimal): price × shares
  totalReceivedDividend: number | null;
  dividend: number | null;
  dividendYield: number | null;
  dividendYieldOnCost: number | null;
  totalProfit: number | null;
  totalProfitPercentage: number | null;
  dailyChange: number | null;
  /**
   * Book currency — the one the position was bought in. After `useHoldings` has normalized
   * the row, every money field on it is in this currency.
   */
  currency?: string;
  /**
   * The provider's quote currency (may be "GBp" pence, or USD for a coin bought in EUR).
   * The API sends currentShareValue/currentTotalValue/dailyChange/dividend in it and leaves
   * profit null where it differs from `currency`; `normalizeHolding` converts. Null when the
   * provider named none, i.e. the figures are already in `currency`.
   */
  quoteCurrency?: string | null;
  /** The price as quoted, in `quoteCurrency` — set by `normalizeHolding`, never by the API. */
  quoteShareValue?: number | null;
  fxRate?: number;     // rateVsEur: units of this currency per 1 EUR
  sharesOutstanding?: number | null; // total shares outstanding (STOCK only); powers Ownership view
}
