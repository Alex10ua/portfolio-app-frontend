import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions, updateTransaction, deleteTransaction } from '../api/transactions';
import type { UpdateTransactionPayload } from '../types/transaction';

export function useTransactions(portfolioId: string, year: number) {
  return useQuery({
    queryKey: ['transactions', portfolioId, year],
    queryFn: () => getTransactions(portfolioId, year),
    enabled: Boolean(portfolioId),
  });
}

export function useUpdateTransaction(portfolioId: string, year: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, payload }: { transactionId: number; payload: UpdateTransactionPayload }) =>
      updateTransaction(portfolioId, transactionId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transactions', portfolioId, year] });
    },
  });
}

export function useDeleteTransaction(portfolioId: string, year: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: number) => deleteTransaction(portfolioId, transactionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transactions', portfolioId, year] });
    },
  });
}
