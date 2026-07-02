import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTickerNote, setTickerNote } from '../api/notes';

export function useTickerNote(portfolioId: string, ticker: string) {
  return useQuery({
    queryKey: ['tickerNote', portfolioId, ticker],
    queryFn: () => getTickerNote(portfolioId, ticker),
    enabled: !!portfolioId && !!ticker,
  });
}

export function useSetTickerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ portfolioId, ticker, note }: { portfolioId: string; ticker: string; note: string }) =>
      setTickerNote(portfolioId, ticker, note),
    onSuccess: (_data, { portfolioId, ticker }) => {
      void qc.invalidateQueries({ queryKey: ['tickerNote', portfolioId, ticker] });
    },
  });
}
