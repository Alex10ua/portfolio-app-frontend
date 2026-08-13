import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addToWatchlist, getWatchlist, previewTicker, refreshWatchlistTicker, removeFromWatchlist,
  searchTickers, setTargetYield,
} from '../api/watchlist';

export function useWatchlist(portfolioId: string) {
  return useQuery({
    queryKey: ['watchlist', portfolioId],
    queryFn: () => getWatchlist(portfolioId),
    enabled: !!portfolioId,
    // prices move intraday, the yield history behind the percentiles moves monthly
    staleTime: 5 * 60 * 1000,
  });
}

/** Add-ticker suggestions. Only fires from 2 characters — one letter matches half the universe. */
export function useTickerSearch(portfolioId: string, query: string) {
  return useQuery({
    queryKey: ['watchlistSearch', portfolioId, query],
    queryFn: () => searchTickers(portfolioId, query),
    enabled: !!portfolioId && query.trim().length >= 2,
    staleTime: 60 * 1000,
  });
}

/** Yield distribution of a ticker being considered, before it is added. */
export function useTickerPreview(portfolioId: string, ticker: string | null) {
  return useQuery({
    queryKey: ['watchlistPreview', portfolioId, ticker],
    queryFn: () => previewTicker(portfolioId, ticker as string),
    enabled: !!portfolioId && !!ticker,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddToWatchlist(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, targetYield }: { ticker: string; targetYield?: number | null }) =>
      addToWatchlist(portfolioId, ticker, targetYield),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['watchlist', portfolioId] });
    },
  });
}

export function useSetTargetYield(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, targetYield }: { ticker: string; targetYield: number }) =>
      setTargetYield(portfolioId, ticker, targetYield),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['watchlist', portfolioId] });
    },
  });
}

export function useRemoveFromWatchlist(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticker: string) => removeFromWatchlist(portfolioId, ticker),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['watchlist', portfolioId] });
    },
  });
}

export function useRefreshWatchlistTicker(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticker: string) => refreshWatchlistTicker(portfolioId, ticker),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['watchlist', portfolioId] });
    },
  });
}
