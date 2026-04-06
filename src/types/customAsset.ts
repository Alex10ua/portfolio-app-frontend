export type PriceUpdateMethod = 'MANUAL' | 'EXTERNAL';

export interface PriceHistoryEntry {
  date: string;
  price: number;
}

export interface CustomAsset {
  id?: string;
  portfolioId?: string;
  ticker: string;
  name: string;
  assetType: string;
  description?: string;
  country?: string;
  currency: string;
  unit: string;
  priceNow: number | null;
  priceHistory: PriceHistoryEntry[];
  priceUpdateMethod: PriceUpdateMethod;
  customFields: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomAssetPayload {
  ticker: string;
  name: string;
  assetType: string;
  description?: string;
  country?: string;
  currency: string;
  unit: string;
  priceNow?: number | string;
  priceUpdateMethod: PriceUpdateMethod;
  customFields?: Record<string, string>;
}
