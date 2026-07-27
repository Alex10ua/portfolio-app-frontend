import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFundamentals, refreshFundamentals } from '../api/fundamentals';

export function useFundamentals(ticker: string) {
  return useQuery({
    queryKey: ['fundamentals', ticker],
    queryFn: () => getFundamentals(ticker),
    enabled: Boolean(ticker),
    staleTime: 60 * 60 * 1000, // SEC filings change quarterly at most
  });
}

export function useRefreshFundamentals(ticker: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => refreshFundamentals(ticker),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fundamentals', ticker] });
    },
  });
}
