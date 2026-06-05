import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllTags, getTagNames, getTickerTags, setTickerTags } from '../api/tags';

export function useAllTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: getAllTags,
  });
}

export function useTagNames() {
  return useQuery({
    queryKey: ['tagNames'],
    queryFn: getTagNames,
  });
}

export function useTickerTags(ticker: string) {
  return useQuery({
    queryKey: ['tickerTags', ticker],
    queryFn: () => getTickerTags(ticker),
    enabled: !!ticker,
  });
}

export function useSetTickerTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, tags }: { ticker: string; tags: string[] }) =>
      setTickerTags(ticker, tags),
    onSuccess: (_data, { ticker }) => {
      void qc.invalidateQueries({ queryKey: ['tags'] });
      void qc.invalidateQueries({ queryKey: ['tagNames'] });
      void qc.invalidateQueries({ queryKey: ['tickerTags', ticker] });
    },
  });
}
