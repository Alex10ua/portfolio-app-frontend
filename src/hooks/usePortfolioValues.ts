import { useQueries } from '@tanstack/react-query';
import { getHoldings } from '../api/holdings';
import { useFxRates } from './useFxRates';
import { useSettings } from '../context/SettingsContext';
import { readLocalPortfolioSettings } from '../lib/portfolioSettingsStore';
import { convert, normalizeCurrency } from '../lib/currency';
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
  const fxRates = useFxRates();
  const { getPortfolioSettings } = useSettings();

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
    const pid = String(p.portfolioId);
    const uniqueCurrencies = [...new Set(
      holdings.map((h) => h.currency).filter((c): c is string => !!c).map(normalizeCurrency)
    )];
    // Each portfolio is shown in its own configured base currency; unset falls
    // back to its single currency, or USD when it mixes several.
    const saved = getPortfolioSettings(pid) ?? readLocalPortfolioSettings(pid);
    const displayCurrency = saved.baseCurrency
      ?? (uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : 'USD');

    const toDisplay = (native: number, from?: string) =>
      convert(native, from ?? displayCurrency, displayCurrency, fxRates);

    const value = holdings.reduce((s, h) =>
      s + toDisplay((h.currentShareValue ?? 0) * h.shareAmount, h.currency), 0);
    const cost = holdings.reduce((s, h) =>
      s + toDisplay((h.costPerShare ?? 0) * h.shareAmount, h.currency), 0);
    const profit = value - cost;

    // Asset type allocation
    const byType: Record<string, number> = {};
    for (const h of holdings) {
      const type = h.assetType ?? 'CUSTOM';
      byType[type] = (byType[type] ?? 0) + toDisplay((h.currentShareValue ?? 0) * h.shareAmount, h.currency);
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
  const totalCurrency = allCurrencies.length === 1 ? allCurrencies[0] : 'USD';

  // Portfolios can each sit in a different base currency — bring them together.
  const total     = items.reduce((s, it) => s + convert(it.value, it.currency, totalCurrency, fxRates), 0);
  const totalCost = items.reduce((s, it) => s + convert(it.cost,  it.currency, totalCurrency, fxRates), 0);

  return { items, total, totalCost, totalCurrency, isLoading };
}
