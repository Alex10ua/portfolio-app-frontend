import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHoldings, getFirstTradeYear, getPortfolioHistory } from '../api/holdings';
import { createTransaction, getCashBalance } from '../api/transactions';
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

export function useCashBalance(portfolioId: string) {
  return useQuery({
    queryKey: ['cashBalance', portfolioId],
    queryFn: () => getCashBalance(portfolioId),
    enabled: Boolean(portfolioId),
  });
}

export function usePortfolioHistory(portfolioId: string) {
  return useQuery({
    queryKey: ['portfolioHistory', portfolioId],
    queryFn: () => getPortfolioHistory(portfolioId),
    enabled: Boolean(portfolioId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTransaction(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) => createTransaction(portfolioId, payload),
    onSuccess: () => {
      // A new transaction affects every derived view, not just holdings/cash.
      // (partial key match also invalidates ['performance', portfolioId, period])
      for (const key of ['holdings', 'cashBalance', 'portfolioHistory', 'dividends', 'dividendCalendar', 'diversification', 'performance']) {
        void qc.invalidateQueries({ queryKey: [key, portfolioId] });
      }
    },
  });
}
