import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getHistoricalData,
  getMarketData,
  getStatistics,
  refreshHistoricalData,
  refreshStatistics,
} from '../api/marketData';

export function useMarketData(ticker: string | null) {
  return useQuery({
    queryKey: ['marketData', ticker],
    queryFn: () => getMarketData(ticker!),
    enabled: Boolean(ticker),
  });
}

export function useStatistics(ticker: string | null) {
  return useQuery({
    queryKey: ['marketStatistics', ticker],
    queryFn: () => getStatistics(ticker!),
    enabled: Boolean(ticker),
    staleTime: 60 * 60 * 1000, // provider refreshes this at most a few times a day
  });
}

export function useRefreshStatistics(ticker: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => refreshStatistics(ticker),
    onSuccess: (data) => {
      qc.setQueryData(['marketStatistics', ticker], data);
    },
  });
}

export function useTickerHistorical(ticker: string | null) {
  return useQuery({
    queryKey: ['tickerHistorical', ticker],
    queryFn: () => getHistoricalData(ticker!),
    enabled: Boolean(ticker),
    staleTime: 60 * 60 * 1000, // dividends/splits/share counts change on filing cadence
  });
}

/** SEC EDGAR share-count backfill — on-demand, like the fundamentals refresh. */
export function useRefreshHistorical(ticker: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => refreshHistoricalData(ticker),
    onSuccess: (data) => {
      if (data) qc.setQueryData(['tickerHistorical', ticker], data);
      else void qc.invalidateQueries({ queryKey: ['tickerHistorical', ticker] });
    },
  });
}
