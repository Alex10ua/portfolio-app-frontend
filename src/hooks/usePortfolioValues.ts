import { useQueries, useQuery } from '@tanstack/react-query';
import { getHoldings } from '../api/holdings';
import { getFxRates } from '../api/fxRates';
import type { Portfolio } from '../types/portfolio';

export type AssetSegment = { label: string; weight: number; color: string };

export type PortfolioValueItem = {
  portfolioId: number;
  name: string;
  value: number;
  cost: number;
  profit: number;
  profitPct: number;
  currency: string;
  assetCount: number;
  allocation: AssetSegment[];
};

const ASSET_COLORS: Record<string, string> = {
  STOCK:    '#3B82F6',
  FUND:     '#8B5CF6',
  CRYPTO:   '#F59E0B',
  COIN:     '#14B8A6',
  FIGURINE: '#EF4444',
  CUSTOM:   '#94A3B8',
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
    const displayCurrency = isMulti ? 'EUR' : (uniqueCurrencies[0] ?? 'EUR');

    const toEur = (native: number, fxRate?: number) =>
      isMulti && fxRate && fxRate !== 0 ? native / fxRate : native;

    const eurValue = holdings.reduce((s, h) =>
      s + toEur((h.currentShareValue ?? 0) * h.shareAmount, h.fxRate), 0);
    const eurCost = holdings.reduce((s, h) =>
      s + toEur((h.costPerShare ?? 0) * h.shareAmount, h.fxRate), 0);
    const eurProfit = eurValue - eurCost;

    const displayRate = fxRates[displayCurrency] ?? 1;
    const value  = eurValue  * displayRate;
    const cost   = eurCost   * displayRate;
    const profit = eurProfit * displayRate;

    // Asset type allocation
    const byType: Record<string, number> = {};
    for (const h of holdings) {
      const type = h.assetType ?? 'CUSTOM';
      byType[type] = (byType[type] ?? 0) + toEur((h.currentShareValue ?? 0) * h.shareAmount, h.fxRate);
    }
    const totalVal = Object.values(byType).reduce((s, v) => s + v, 0);
    const allocation: AssetSegment[] = Object.entries(byType).map(([label, v]) => ({
      label,
      weight: totalVal > 0 ? (v / totalVal) * 100 : 0,
      color: ASSET_COLORS[label] ?? '#94A3B8',
    }));

    return {
      portfolioId: p.portfolioId,
      name: p.portfolioName,
      value, cost, profit,
      profitPct: cost > 0 ? (profit / cost) * 100 : 0,
      currency: displayCurrency,
      assetCount: holdings.length,
      allocation,
    };
  });

  const allCurrencies = [...new Set(items.map((item) => item.currency))];
  const totalCurrency = allCurrencies.length === 1 ? allCurrencies[0] : 'EUR';

  const total     = items.reduce((s, it) => s + it.value,  0);
  const totalCost = items.reduce((s, it) => s + it.cost,   0);

  return { items, total, totalCost, totalCurrency, isLoading };
}
