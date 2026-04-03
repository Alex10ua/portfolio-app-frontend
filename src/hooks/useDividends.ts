import { useQuery } from '@tanstack/react-query';
import { getDividends } from '../api/dividends';

export function useDividends(portfolioId: string) {
  return useQuery({
    queryKey: ['dividends', portfolioId],
    queryFn: () => getDividends(portfolioId),
    enabled: Boolean(portfolioId),
  });
}
