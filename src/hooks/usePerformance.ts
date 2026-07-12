import { useQuery } from '@tanstack/react-query';
import { getPerformance, getRealizedPnL } from '../api/performance';
import type { PerformancePeriod } from '../types/performance';

export function usePerformance(portfolioId: string, period: PerformancePeriod) {
  return useQuery({
    queryKey: ['performance', portfolioId, period],
    queryFn: () => getPerformance(portfolioId, period),
    enabled: Boolean(portfolioId),
    staleTime: 60_000,
  });
}

export function useRealizedPnL(portfolioId: string) {
  return useQuery({
    queryKey: ['performance', portfolioId, 'realizedPnL'],
    queryFn: () => getRealizedPnL(portfolioId),
    enabled: Boolean(portfolioId),
    staleTime: 60_000,
  });
}
