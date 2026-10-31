import { useQueries } from '@tanstack/react-query';
import { getHoldings } from '../api/holdings';
import { useFxRates } from './useFxRates';
import { useSettings } from '../context/SettingsContext';
import { readLocalPortfolioSettings } from '../lib/portfolioSettingsStore';
import { normalizeCurrency } from '../lib/currency';
import { getWealth } from '../api/wealth';
import { summarizeWealth, convertWealthMap } from '../lib/wealth';
import type { Holding } from '../types/holding';
import type { Portfolio } from '../types/portfolio';

export type AssetSegment = { label: string; weight: number; color: string };

export type PortfolioValueItem = {
  portfolioId: string;
  name: string;
  value: number;
  cost: number;
  profit: number;
  profitPct: number;
  currency: string;
  assetCount: number;
  allocation: AssetSegment[];
  complete: boolean;
  investmentComplete: boolean;
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
      // Read native quote/cost maps here. Normalizing into book currency first can hide missing FX.
    })),
  });
  const wealthResults = useQueries({
    queries: portfolios.map(p => ({
      queryKey: ['wealth', String(p.portfolioId)],
      queryFn: () => getWealth(String(p.portfolioId)),
    })),
  });

  const isLoading = results.some((r) => r.isLoading) || wealthResults.some(r => r.isLoading);

  const items: PortfolioValueItem[] = portfolios.map((p, i) => {
    const holdings = results[i]?.data ?? [];
    const pid = String(p.portfolioId);
    const saved = getPortfolioSettings(pid) ?? readLocalPortfolioSettings(pid);
    // Real estate hidden for this portfolio → its value is investments + cash, as on the dashboard.
    const includeProperty = !saved.hideRealEstate;
    const uniqueCurrencies = [...new Set(
      [...holdings.map((h) => h.currency).filter((c): c is string => !!c),
        ...Object.keys(wealthResults[i]?.data?.manualCashByCurrency ?? {}),
        ...(includeProperty ? wealthResults[i]?.data?.properties ?? [] : []).map(v => v.property.currency)].map(normalizeCurrency)
    )];
    // Each portfolio is shown in its own configured base currency; unset falls
    // back to its single currency, or USD when it mixes several.
    const displayCurrency = saved.baseCurrency
      ?? (uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : 'USD');

    const valuesByCurrency: Record<string, number> = {};
    const costsByCurrency: Record<string, number> = {};
    let valueInputsComplete = true;
    let costInputsComplete = true;
    const addNative = (target: Record<string, number>, currency: string | null | undefined, native: unknown) => {
      if (!currency || native == null || !Number.isFinite(Number(native))) return false;
      target[currency] = (target[currency] ?? 0) + Number(native);
      return true;
    };
    const quoteValue = (holding: Holding) => holding.currentTotalValue
      ?? (holding.currentShareValue == null ? null : holding.currentShareValue * (holding.exactShareAmount ?? holding.shareAmount));
    for (const holding of holdings) {
      valueInputsComplete = addNative(valuesByCurrency, holding.quoteCurrency ?? holding.currency, quoteValue(holding)) && valueInputsComplete;
      if (holding.costBasisByCurrency && Object.keys(holding.costBasisByCurrency).length > 0) {
        for (const [currency, amount] of Object.entries(holding.costBasisByCurrency)) {
          costInputsComplete = addNative(costsByCurrency, currency, amount) && costInputsComplete;
        }
      } else {
        // A missing FIFO basis is unknown; reconstructing it from average price would drop fees/lots.
        costInputsComplete = addNative(costsByCurrency, holding.currency, holding.costBasis) && costInputsComplete;
      }
    }
    const investmentFallback = convertWealthMap(valuesByCurrency, displayCurrency, fxRates);
    const convertedCost = convertWealthMap(costsByCurrency, displayCurrency, fxRates);
    const cost = convertedCost.value;
    const wealth = wealthResults[i]?.data;
    const summary = wealth ? summarizeWealth(wealth, displayCurrency, fxRates, includeProperty) : null;
    const investmentValue = summary?.investments ?? investmentFallback.value;
    const investmentComplete = valueInputsComplete && costInputsComplete && investmentFallback.complete && convertedCost.complete
      && !results[i]?.isError && (!wealth || wealth.missingInvestmentTickers.length === 0);
    const value = summary?.total ?? investmentValue;
    // Unknown costs/prices cannot establish either profit or a loss. The companion flag hides these figures in callers.
    const profit = investmentComplete ? investmentValue - cost : 0;

    // Asset type allocation
    const byType: Record<string, number> = {};
    for (const h of holdings) {
      const type = h.assetType ?? 'CUSTOM';
      const native = quoteValue(h);
      const currency = h.quoteCurrency ?? h.currency;
      if (native != null && currency) {
        byType[type] = (byType[type] ?? 0) + convertWealthMap({ [currency]: native }, displayCurrency, fxRates).value;
      }
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
      assetCount: holdings.length + (includeProperty ? wealth?.properties.length ?? 0 : 0),
      allocation,
      complete: summary?.complete === true && investmentComplete,
      investmentComplete,
    };
  });

  const allCurrencies = [...new Set(items.map((item) => item.currency))];
  const totalCurrency = allCurrencies.length === 1 ? allCurrencies[0] : 'USD';

  // Portfolios can each sit in a different base currency — bring them together.
  const converted = items.map(it => ({
    id: it.portfolioId,
    value: convertWealthMap({ [it.currency]: it.value }, totalCurrency, fxRates),
    cost: convertWealthMap({ [it.currency]: it.cost }, totalCurrency, fxRates),
    profit: convertWealthMap({ [it.currency]: it.profit }, totalCurrency, fxRates),
  }));
  const total = converted.reduce((s, it) => s + it.value.value, 0);
  const totalCost = converted.reduce((s, it) => s + it.cost.value, 0);
  const totalProfit = converted.reduce((s, it) => s + it.profit.value, 0);
  const complete = items.every(it => it.complete) && converted.every(it => it.value.complete && it.cost.complete && it.profit.complete);
  const investmentComplete = items.every(it => it.investmentComplete) && converted.every(it => it.cost.complete && it.profit.complete);
  const allocationValues = Object.fromEntries(converted.map(it => [it.id, it.value.value]));

  return { items, total, totalCost, totalProfit, totalCurrency, isLoading, complete, investmentComplete, allocationValues };
}
