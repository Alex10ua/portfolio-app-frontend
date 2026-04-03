import { useQuery } from '@tanstack/react-query';
import { getDividendCalendar } from '../api/dividendCalendar';

export function useDividendCalendar(portfolioId: string) {
  return useQuery({
    queryKey: ['dividendCalendar', portfolioId],
    queryFn: () => getDividendCalendar(portfolioId),
    enabled: Boolean(portfolioId),
  });
}
