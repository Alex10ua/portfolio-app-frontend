import { useQueries } from '@tanstack/react-query';
import { getHoldings } from '../api/holdings';
import type { Portfolio } from '../types/portfolio';

export function usePortfolioValues(portfolios: Portfolio[]) {
  const results = useQueries({
    queries: portfolios.map((p) => ({
      queryKey: ['holdings', String(p.portfolioId)],
      queryFn: () => getHoldings(String(p.portfolioId)),
      enabled: portfolios.length > 0,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const items = portfolios.map((p, i) => {
    const holdings = results[i]?.data ?? [];
    const value = holdings.reduce((s, h) => s + (h.currentShareValue ?? 0) * h.shareAmount, 0);
    return { portfolioId: p.portfolioId, name: p.portfolioName, value };
  });
  const total = items.reduce((s, item) => s + item.value, 0);

  return { items, total, isLoading };
}
