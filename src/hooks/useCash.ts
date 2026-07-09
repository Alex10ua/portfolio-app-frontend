import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCashHoldings, upsertCashHolding, deleteCashHolding } from '../api/cash';

export function useCashHoldings(portfolioId: string) {
  return useQuery({
    queryKey: ['cashHoldings', portfolioId],
    queryFn: () => getCashHoldings(portfolioId),
    enabled: !!portfolioId,
  });
}

export function useUpsertCashHolding(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ currency, amount }: { currency: string; amount: number }) =>
      upsertCashHolding(portfolioId, currency, amount),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cashHoldings', portfolioId] });
    },
  });
}

export function useDeleteCashHolding(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currency: string) => deleteCashHolding(portfolioId, currency),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cashHoldings', portfolioId] });
    },
  });
}
