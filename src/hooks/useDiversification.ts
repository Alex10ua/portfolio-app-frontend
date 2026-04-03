import { useQuery } from '@tanstack/react-query';
import { getDiversification } from '../api/diversification';

export function useDiversification(portfolioId: string) {
  return useQuery({
    queryKey: ['diversification', portfolioId],
    queryFn: () => getDiversification(portfolioId),
    enabled: Boolean(portfolioId),
  });
}
