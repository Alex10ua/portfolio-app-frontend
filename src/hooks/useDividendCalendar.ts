import { useQuery } from '@tanstack/react-query';
import { getDividendCalendar } from '../api/dividendCalendar';

/** `year` omitted = the rolling 12-month projection. */
export function useDividendCalendar(portfolioId: string, year?: number, enabled = true) {
  return useQuery({
    queryKey: ['dividendCalendar', portfolioId, year],
    queryFn: () => getDividendCalendar(portfolioId, year),
    enabled: enabled && Boolean(portfolioId),
  });
}
