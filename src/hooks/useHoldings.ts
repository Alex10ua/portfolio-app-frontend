import { useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHoldings, getFirstTradeYear, getPortfolioHistory } from '../api/holdings';
import { createTransaction, getCashBalance } from '../api/transactions';
import { normalizeHoldings } from '../lib/holdingCurrency';
import { TransactionRetryKeys } from '../lib/transactionRetry';
import { useFxRates } from './useFxRates';
import type { Holding } from '../types/holding';
import type { CreateTransactionPayload } from '../types/transaction';

/**
 * Holdings with every money field in the row's book currency. The cache keeps the API's
 * shape (market figures in the quote currency); `select` converts per observer, so the
 * rows follow the FX rates when they refresh.
 */
export function useHoldings(portfolioId: string) {
  const fxRates = useFxRates();
  const select = useCallback((data: Holding[]) => normalizeHoldings(data, fxRates), [fxRates]);
  return useQuery({
    queryKey: ['holdings', portfolioId],
    queryFn: () => getHoldings(portfolioId),
    enabled: Boolean(portfolioId),
    select,
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
  const retryKeys = useRef(new TransactionRetryKeys());
  return useMutation({
    mutationFn: async (payload: CreateTransactionPayload) => {
      const signature = retryKeys.current.signature(portfolioId, payload);
      const key = retryKeys.current.get(signature);
      const result = await createTransaction(portfolioId, payload, key);
      retryKeys.current.complete(signature, key);
      return result;
    },
    onSuccess: () => {
      // A new transaction affects every derived view, not just holdings/cash.
      // (partial key match also invalidates ['performance', portfolioId, period])
      for (const key of ['transactions', 'holdings', 'cashBalance', 'portfolioHistory', 'dividends', 'dividendCalendar', 'diversification', 'performance', 'tags', 'tagNames', 'tickerTags']) {
        void qc.invalidateQueries({ queryKey: [key, portfolioId] });
      }
    },
  });
}
