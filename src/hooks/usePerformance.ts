import { useQuery } from '@tanstack/react-query';
import { getPerformance } from '../api/performance';
import type { PerformancePeriod } from '../types/performance';

export function usePerformance(portfolioId: string, period: PerformancePeriod) {
  return useQuery({
    queryKey: ['performance', portfolioId, period],
    queryFn: () => getPerformance(portfolioId, period),
    enabled: Boolean(portfolioId),
    staleTime: 60_000,
  });
}
