import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllTags, getTagNames, getTickerTags, setTickerTags } from '../api/tags';

export function useAllTags(portfolioId: string) {
  return useQuery({
    queryKey: ['tags', portfolioId],
    queryFn: () => getAllTags(portfolioId),
    enabled: !!portfolioId,
  });
}

export function useTagNames(portfolioId: string) {
  return useQuery({
    queryKey: ['tagNames', portfolioId],
    queryFn: () => getTagNames(portfolioId),
    enabled: !!portfolioId,
  });
}

export function useTickerTags(portfolioId: string, ticker: string) {
  return useQuery({
    queryKey: ['tickerTags', portfolioId, ticker],
    queryFn: () => getTickerTags(portfolioId, ticker),
    enabled: !!portfolioId && !!ticker,
  });
}

export function useSetTickerTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ portfolioId, ticker, tags }: { portfolioId: string; ticker: string; tags: string[] }) =>
      setTickerTags(portfolioId, ticker, tags),
    onSuccess: (_data, { portfolioId, ticker }) => {
      void qc.invalidateQueries({ queryKey: ['tags', portfolioId] });
      void qc.invalidateQueries({ queryKey: ['tagNames', portfolioId] });
      void qc.invalidateQueries({ queryKey: ['tickerTags', portfolioId, ticker] });
    },
  });
}
