export type AssetType = 'STOCK' | 'FIGURINE' | 'COIN' | 'FUND' | 'CRYPTO' | 'CUSTOM';

export interface Holding {
  ticker: string;
  assetType: AssetType | null;
  name: string | null;
  shareAmount: number;
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
  currency?: string;   // native currency of the asset, e.g. "USD"
  fxRate?: number;     // rateVsEur: units of this currency per 1 EUR
  sharesOutstanding?: number | null; // total shares outstanding (STOCK only); powers Ownership view
}
