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
}
