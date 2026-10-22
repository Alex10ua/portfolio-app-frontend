import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDividendReceipts, saveDividendReceipt } from '../api/dividendReceipts';
import type { DividendReceipt } from '../types/dividendCalendar';

export function useDividendReceipts(portfolioId: string) {
  return useQuery({
    queryKey: ['dividendReceipts', portfolioId],
    queryFn: () => getDividendReceipts(portfolioId),
    enabled: Boolean(portfolioId),
  });
}

const sameKey = (a: DividendReceipt, b: DividendReceipt) => a.ticker === b.ticker && a.exDate === b.exDate;

/**
 * Optimistic: the receipt check has to flip on click, not a round trip later.
 * The cache is rolled back if the server refuses.
 */
export function useSaveDividendReceipt(portfolioId: string) {
  const qc = useQueryClient();
  const key = ['dividendReceipts', portfolioId];
  return useMutation({
    mutationFn: (receipt: DividendReceipt) => saveDividendReceipt(portfolioId, receipt),
    onMutate: async (receipt) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<DividendReceipt[]>(key);
      const rest = (previous ?? []).filter((r) => !sameKey(r, receipt));
      const cleared = receipt.status == null && receipt.withholdingRate == null;
      qc.setQueryData<DividendReceipt[]>(key, cleared ? rest : [...rest, receipt]);
      return { previous };
    },
    onError: (_err, _receipt, context) => {
      qc.setQueryData(key, context?.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
}
