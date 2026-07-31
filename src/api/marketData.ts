import apiClient from './client';
import type { MarketData, MarketStatistics, TickerHistoricalData } from '../types/marketData';

export async function getMarketData(ticker: string): Promise<MarketData> {
  const response = await apiClient.get<MarketData>(`/market-data/${ticker}`);
  return response.data;
}

/** null when no Yahoo update has ever stored statistics for the ticker (404). */
export async function getStatistics(ticker: string): Promise<MarketStatistics | null> {
  try {
    const response = await apiClient.get<MarketStatistics>(`/market-data/${ticker}/statistics`);
    return response.data;
  } catch (e) {
    const err = e as { response?: { status?: number } };
    if (err.response?.status === 404) return null;
    throw e;
  }
}

/** Fetches a fresh Yahoo snapshot server-side; resolves to null when the provider had nothing. */
export async function refreshStatistics(ticker: string): Promise<MarketStatistics | null> {
  const response = await apiClient.post<MarketStatistics | { status: string }>(
    `/market-data/${ticker}/statistics/refresh`,
  );
  return 'status' in response.data ? null : response.data;
}

/** null when the ticker has no marketData doc at all (404). */
export async function getHistoricalData(ticker: string): Promise<TickerHistoricalData | null> {
  try {
    const response = await apiClient.get<TickerHistoricalData>(`/market-data/${ticker}/historical`);
    return response.data;
  } catch (e) {
    const err = e as { response?: { status?: number } };
    if (err.response?.status === 404) return null;
    throw e;
  }
}

/** Backfills the share-count series from SEC EDGAR (US-registered issuers only), then returns it. */
export async function refreshHistoricalData(ticker: string): Promise<TickerHistoricalData | null> {
  const response = await apiClient.post<TickerHistoricalData | { status: string }>(
    `/market-data/${ticker}/historical/refresh`,
  );
  return 'status' in response.data ? null : response.data;
}
