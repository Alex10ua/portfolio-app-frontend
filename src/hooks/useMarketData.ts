import { useQuery } from '@tanstack/react-query';
import { getMarketData } from '../api/marketData';

export function useMarketData(ticker: string | null) {
  return useQuery({
    queryKey: ['marketData', ticker],
    queryFn: () => getMarketData(ticker!),
    enabled: Boolean(ticker),
  });
}
