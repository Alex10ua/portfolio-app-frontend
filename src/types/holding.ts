export type AssetType = 'STOCK' | 'FIGURINE' | 'COIN' | 'FUND' | 'CRYPTO' | 'CUSTOM';

export interface Holding {
  ticker: string;
  assetType: AssetType | null;
  name: string | null;
  shareAmount: number;
  costPerShare: number | null;
  currentShareValue: number | null;
  dividend: number | null;
  dividendYield: number | null;
  dividendYieldOnCost: number | null;
  totalProfit: number | null;
  totalProfitPercentage: number | null;
  dailyChange: number | null;
  currency?: string;   // native currency of the asset, e.g. "USD"
  fxRate?: number;     // rateVsEur: units of this currency per 1 EUR
}
