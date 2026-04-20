import apiClient from './client';
import type { MarketData } from '../types/marketData';

export async function getMarketData(ticker: string): Promise<MarketData> {
  const response = await apiClient.get<MarketData>(`/market-data/${ticker}`);
  return response.data;
}
