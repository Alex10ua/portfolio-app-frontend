import { useQuery } from '@tanstack/react-query';
import { getWealth, getWealthHistory } from '../api/wealth';
import { getPortfolioHistory } from '../api/holdings';
import type { WealthHistoryPoint } from '../types/wealth';

export function useWealth(portfolioId: string) {
  return useQuery({ queryKey: ['wealth', portfolioId], queryFn: () => getWealth(portfolioId), enabled: !!portfolioId });
}

export function useWealthHistory(portfolioId: string, includeProperty = true) {
  return useQuery({
    queryKey: includeProperty ? ['wealth-history', portfolioId] : ['wealth-history', portfolioId, 'investments'],
    queryFn: async (): Promise<WealthHistoryPoint[]> => includeProperty ? getWealthHistory(portfolioId)
      : (await getPortfolioHistory(portfolioId)).map(point => ({
        date: point.date,
        investmentValueByCurrency: point.valueByCurrency ?? {},
        ownedPropertyValueByCurrency: {}, mortgagePrincipalByCurrency: {}, propertyEquityByCurrency: {},
        complete: point.valueByCurrency != null, missingPropertyIds: [], estimatedPropertyIds: [],
        estimatedPriceTickers: point.estimatedPriceTickers ?? [],
      })),
    enabled: !!portfolioId,
  });
}
