export type AssetType = 'STOCK' | 'FIGURINE' | 'COIN' | 'FUND' | 'CRYPTO';

export interface Holding {
  ticker: string;
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
