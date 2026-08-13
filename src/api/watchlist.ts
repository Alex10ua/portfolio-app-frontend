import apiClient from './client';
import type { TickerSuggestion, WatchlistEntry } from '../types/watchlist';

export async function getWatchlist(portfolioId: string): Promise<WatchlistEntry[]> {
  const res = await apiClient.get<WatchlistEntry[]>(`${portfolioId}/watchlist`);
  return res.data;
}

export async function searchTickers(portfolioId: string, q: string): Promise<TickerSuggestion[]> {
  const res = await apiClient.get<TickerSuggestion[]>(`${portfolioId}/watchlist/search`, { params: { q } });
  return res.data;
}

/** Distribution preview for a ticker not on the list yet. Null when nothing is stored for it. */
export async function previewTicker(portfolioId: string, ticker: string): Promise<WatchlistEntry | null> {
  try {
    const res = await apiClient.get<WatchlistEntry>(`${portfolioId}/watchlist/preview`, { params: { ticker } });
    return res.data;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null
    && (err as { response?: { status?: number } }).response?.status === 404;
}

/**
 * Add a ticker. An unknown symbol is fetched from the provider first, so this can
 * take several seconds; omitting targetYield defaults it to the 5-year 90th
 * percentile of the ticker's own yield history.
 */
export async function addToWatchlist(
  portfolioId: string,
  ticker: string,
  targetYield?: number | null,
): Promise<WatchlistEntry> {
  const res = await apiClient.post<WatchlistEntry>(`${portfolioId}/watchlist`, { ticker, targetYield });
  return res.data;
}

export async function setTargetYield(
  portfolioId: string,
  ticker: string,
  targetYield: number,
): Promise<WatchlistEntry> {
  const res = await apiClient.put<WatchlistEntry>(`${portfolioId}/watchlist/${ticker}`, { targetYield });
  return res.data;
}

export async function removeFromWatchlist(portfolioId: string, ticker: string): Promise<void> {
  await apiClient.delete(`${portfolioId}/watchlist/${ticker}`);
}

export async function refreshWatchlistTicker(portfolioId: string, ticker: string): Promise<WatchlistEntry> {
  const res = await apiClient.post<WatchlistEntry>(`${portfolioId}/watchlist/${ticker}/refresh`);
  return res.data;
}
