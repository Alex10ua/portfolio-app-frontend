import { useQueries, useQuery } from '@tanstack/react-query';
import { getHoldings } from '../api/holdings';
import { getFxRates } from '../api/fxRates';
import type { Portfolio } from '../types/portfolio';

export type PortfolioValueItem = {
  portfolioId: number;
  name: string;
  value: number;
  currency: string;
};

export function usePortfolioValues(portfolios: Portfolio[]) {
  const { data: fxRates = {} } = useQuery({
    queryKey: ['fxRates'],
    queryFn: getFxRates,
  });

  const results = useQueries({
    queries: portfolios.map((p) => ({
      queryKey: ['holdings', String(p.portfolioId)],
      queryFn: () => getHoldings(String(p.portfolioId)),
      enabled: portfolios.length > 0,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);

  const items: PortfolioValueItem[] = portfolios.map((p, i) => {
    const holdings = results[i]?.data ?? [];
    const uniqueCurrencies = [...new Set(
      holdings.map((h) => h.currency).filter((c): c is string => !!c)
    )];
    const isMulti = uniqueCurrencies.length > 1;
    const displayCurrency = isMulti ? 'USD' : (uniqueCurrencies[0] ?? 'USD');

    // Sum everything in EUR first
    const eurValue = holdings.reduce((s, h) => {
      const native = (h.currentShareValue ?? 0) * h.shareAmount;
      return s + (h.fxRate && h.fxRate !== 0 ? native / h.fxRate : native);
    }, 0);

    // Convert EUR to displayCurrency (fxRate = units of currency per 1 EUR)
    const displayRate = fxRates[displayCurrency] ?? 1;
    const value = eurValue * displayRate;

    return { portfolioId: p.portfolioId, name: p.portfolioName, value, currency: displayCurrency };
  });

  // Grand total: all in EUR, then convert to single currency if all portfolios share one
  const allCurrencies = [...new Set(items.map((item) => item.currency))];
  const totalCurrency = allCurrencies.length === 1 ? allCurrencies[0] : 'USD';

  const totalEur = portfolios.reduce((sum, _, i) => {
    const holdings = results[i]?.data ?? [];
    return sum + holdings.reduce((s, h) => {
      const native = (h.currentShareValue ?? 0) * h.shareAmount;
      return s + (h.fxRate && h.fxRate !== 0 ? native / h.fxRate : native);
    }, 0);
  }, 0);
  const totalDisplayRate = fxRates[totalCurrency] ?? 1;
  const total = totalEur * totalDisplayRate;

  return { items, total, totalCurrency, isLoading };
}
