import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHoldings, getFirstTradeYear } from '../api/holdings';
import { createTransaction } from '../api/transactions';
import type { CreateTransactionPayload } from '../types/transaction';

export function useHoldings(portfolioId: string) {
  return useQuery({
    queryKey: ['holdings', portfolioId],
    queryFn: () => getHoldings(portfolioId),
    enabled: Boolean(portfolioId),
  });
}

export function useFirstTradeYear(portfolioId: string) {
  return useQuery({
    queryKey: ['firstTradeYear', portfolioId],
    queryFn: () => getFirstTradeYear(portfolioId),
    enabled: Boolean(portfolioId),
    staleTime: Infinity,
  });
}

export function useCreateTransaction(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) => createTransaction(portfolioId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['holdings', portfolioId] });
    },
  });
}
