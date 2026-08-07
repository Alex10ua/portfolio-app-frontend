import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Upload, Settings, ArrowUp, ArrowDown,
  TrendingUp, DollarSign, BarChart2, Percent, LayoutGrid, Banknote,
  Wallet, Pencil, Trash2,
} from 'lucide-react';
import { useHoldings, useFirstTradeYear, useCreateTransaction, useCashBalance, usePortfolioHistory } from '../../hooks/useHoldings';
import { useCashHoldings, useUpsertCashHolding, useDeleteCashHolding } from '../../hooks/useCash';
import { useRealizedPnL } from '../../hooks/usePerformance';
import { useSettings } from '../../context/SettingsContext';
import { useFxRates } from '../../hooks/useFxRates';
import { convert, formatMoney, normalizeCurrency } from '../../lib/currency';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import Dialog from '../../components/ui/Dialog';
import CreateTransactionDialog from './CreateTransactionDialog';
import ImportTransactionsModal from './ImportTransactionsModal';
import HoldingDetailDialog from './HoldingDetailDialog';
import PortfolioValueChart from './PortfolioValueChart';
import PortfolioSettingsDialog from './PortfolioSettingsDialog';
import { DEFAULT_COLUMNS, mergeColumns, type Column } from './holdingsColumns';
import { readLocalPortfolioSettings } from '../../lib/portfolioSettingsStore';
import { formatPercent } from '../../lib/formatters';
import StockLogo from '../../components/ui/StockLogo';
import type { AssetType, Holding } from '../../types/holding';
import type { ChartRange, CurrencyDisplay } from '../../types/settings';

type SortOrder = 'asc' | 'desc';

const CHART_RANGES: ChartRange[] = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];
const RANGE_MONTHS: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * Start month ('YYYY-MM') for a range, clamped to the months the chart actually
 * has: a window reaching before the first point starts at the first point, and a
 * window starting after the last point falls back to it so the chart is never empty.
 */
function rangeStartMonth(range: ChartRange, months: string[]): string {
  if (months.length === 0) return '';
  const first = months[0];
  if (range === 'ALL') return first;
  const d = new Date();
  d.setDate(1);
  if (range === 'YTD') d.setMonth(0);
  else d.setMonth(d.getMonth() - RANGE_MONTHS[range]);
  const key = monthKey(d);
  const last = months[months.length - 1];
  if (key <= first) return first;
  return key > last ? last : key;
}

// Single source for the "Total Value" figure — used by the column, sorting, and % of Portfolio.
// Prefer the backend-computed BigDecimal value; fall back to a client calc only for legacy/null.
const holdingTotalValue = (h: Holding) =>
  h.currentTotalValue ?? (h.currentShareValue ?? 0) * h.shareAmount;
const holdingCostBasis = (h: Holding) =>
  h.costBasis ?? (h.costPerShare ?? 0) * h.shareAmount;

const ASSET_CHIP_COLORS: Record<string, string> = {
  STOCK:    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  FUND:     'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
  CRYPTO:   'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  COIN:     'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400',
  FIGURINE: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  CUSTOM:   'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
};

export default function HoldingsDashboardPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const pid = portfolioId!;

  const { data: holdings, isLoading, error } = useHoldings(pid);
  const { data: firstTradeYear } = useFirstTradeYear(pid);
  const { mutateAsync: createTransaction, isPending: creating } = useCreateTransaction(pid);
  const { data: cashBalance } = useCashBalance(pid);
  const { data: manualCash } = useCashHoldings(pid);
  const { data: valueHistory } = usePortfolioHistory(pid);
  const { data: realizedByCcy } = useRealizedPnL(pid);
  const { mutateAsync: saveCash, isPending: savingCash } = useUpsertCashHolding(pid);
  const { mutateAsync: removeCash } = useDeleteCashHolding(pid);
  const fxRates = useFxRates();

  const [createOpen, setCreateOpen]   = useState(false);
  const [importOpen, setImportOpen]   = useState(false);
  // null = closed; isEdit locks the currency field to the existing position
  const [cashDialog, setCashDialog]   = useState<{ currency: string; amount: string; isEdit?: boolean } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailHolding, setDetailHolding] = useState<Holding | null>(null);

  // Per-portfolio UI settings seeded from the localStorage mirror (instant paint);
  // the server copy is applied once it loads. The component is remounted per
  // portfolio (PortfolioScope in App.tsx), so these initializers re-run on switch.
  const [localSettings] = useState(() => readLocalPortfolioSettings(pid));
  const [chartRange, setChartRange]   = useState<ChartRange>(localSettings.chartRange ?? 'YTD');
  const [orderBy, setOrderBy]         = useState<string>(localSettings.sortBy ?? 'ticker');
  const [order, setOrder]             = useState<SortOrder>(localSettings.sortOrder ?? 'asc');
  const [assetFilter, setAssetFilter] = useState<AssetType | 'ALL'>((localSettings.assetFilter as AssetType | 'ALL') ?? 'ALL');
  const [columns, setColumns] = useState<Column[]>(() =>
    localSettings.tableConfig ? mergeColumns(localSettings.tableConfig as Column[]) : DEFAULT_COLUMNS);
  // undefined = auto-detect from the holdings (single currency, else USD)
  const [currencyPref, setCurrencyPref] = useState<string | undefined>(localSettings.baseCurrency);
  const [currencyDisplay, setCurrencyDisplay] = useState<CurrencyDisplay>(localSettings.currencyDisplay ?? 'Symbol');

  // Server-backed settings: localStorage paints instantly, then the server copy
  // (source of truth, synced across devices) is applied once — unless the user
  // already touched the config this visit (dirtyRef guards their edits).
  const { settingsLoaded, getPortfolioSettings, updatePortfolioSettings } = useSettings();
  const settingsDirtyRef = useRef(false);
  useEffect(() => {
    if (!settingsLoaded || settingsDirtyRef.current) return;
    const server = getPortfolioSettings(pid);
    if (!server) return;
    if (server.tableConfig) {
      const merged = mergeColumns(server.tableConfig as Column[]);
      setColumns((prev) => JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged);
    }
    if (server.chartRange) setChartRange((prev) => prev === server.chartRange ? prev : server.chartRange!);
    if (server.sortBy) setOrderBy((prev) => prev === server.sortBy ? prev : server.sortBy!);
    if (server.sortOrder) setOrder((prev) => prev === server.sortOrder ? prev : server.sortOrder!);
    if (server.assetFilter) {
      setAssetFilter((prev) => prev === server.assetFilter ? prev : server.assetFilter as AssetType | 'ALL');
    }
    if (server.baseCurrency) setCurrencyPref((prev) => prev === server.baseCurrency ? prev : server.baseCurrency);
    if (server.currencyDisplay) {
      setCurrencyDisplay((prev) => prev === server.currencyDisplay ? prev : server.currencyDisplay!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, pid]);

  useEffect(() => {
    updatePortfolioSettings(pid, { tableConfig: columns });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, pid]);

  useEffect(() => {
    if (firstTradeYear) {
      try { localStorage.setItem(`firstTradeYear-${pid}`, String(firstTradeYear)); } catch { /* storage blocked */ }
    }
  }, [firstTradeYear, pid]);

  const applySort = (key: string, dir: SortOrder) => {
    settingsDirtyRef.current = true;
    setOrderBy(key);
    setOrder(dir);
    updatePortfolioSettings(pid, { sortBy: key, sortOrder: dir });
  };

  const handleSort = (key: string) =>
    applySort(key, orderBy === key && order === 'asc' ? 'desc' : 'asc');

  const changeAssetFilter = (filter: AssetType | 'ALL') => {
    settingsDirtyRef.current = true;
    setAssetFilter(filter);
    updatePortfolioSettings(pid, { assetFilter: filter });
  };

  const changeBaseCurrency = (code: string) => {
    settingsDirtyRef.current = true;
    setCurrencyPref(code);
    updatePortfolioSettings(pid, { baseCurrency: code });
  };

  const changeCurrencyDisplay = (display: CurrencyDisplay) => {
    settingsDirtyRef.current = true;
    setCurrencyDisplay(display);
    updatePortfolioSettings(pid, { currencyDisplay: display });
  };

  const resetSettings = () => {
    settingsDirtyRef.current = true;
    setColumns(DEFAULT_COLUMNS);   // persisted by the columns effect
    setChartRange('YTD');
    setOrderBy('ticker');
    setOrder('asc');
    setAssetFilter('ALL');
    setCurrencyPref(undefined);    // back to auto-detect
    setCurrencyDisplay('Symbol');
    updatePortfolioSettings(pid, {
      chartRange: 'YTD', sortBy: 'ticker', sortOrder: 'asc', assetFilter: 'ALL',
      baseCurrency: undefined, currencyDisplay: 'Symbol',
    });
  };

  const moveColumn = (fromKey: string, toKey: string) => {
    settingsDirtyRef.current = true;
    setColumns((prev) => {
      const from = prev.findIndex((c) => c.key === fromKey);
      const to = prev.findIndex((c) => c.key === toKey);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const toggleColumn = (key: string) => {
    settingsDirtyRef.current = true;
    setColumns((prev) => {
      const visibleCount = prev.filter((c) => c.visible).length;
      return prev.map((c) => {
        if (c.key !== key) return c;
        if (c.visible && visibleCount === 1) return c;
        return { ...c, visible: !c.visible };
      });
    });
  };

  const filteredHoldings = useMemo(() => {
    if (!holdings) return [];
    if (assetFilter === 'ALL') return holdings;
    return holdings.filter((h) => h.assetType === assetFilter);
  }, [holdings, assetFilter]);

  const assetFilterCounts = useMemo(() => {
    if (!holdings) return {};
    return holdings.reduce<Record<string, number>>((acc, h) => {
      const key = h.assetType ?? 'UNKNOWN';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [holdings]);

  // Currencies the portfolio actually holds — the picker lists them first and
  // they are the candidates for the auto-detected base.
  const heldCurrencies = useMemo(
    () => [...new Set((holdings ?? []).map((h) => h.currency).filter((c): c is string => !!c))],
    [holdings]);

  // An explicit setting wins. Otherwise: single-currency portfolio → that
  // currency, mixed → USD (the long-standing default).
  const baseCurrency = currencyPref
    ?? (heldCurrencies.length === 1 ? normalizeCurrency(heldCurrencies[0])
      : heldCurrencies.length ? 'USD' : '');

  /** Native amount → the portfolio's base currency, using the rates held client-side. */
  const toBase = useMemo(
    () => (value: number | null | undefined, from?: string | null) =>
      convert(Number(value) || 0, from ?? baseCurrency, baseCurrency, fxRates),
    [baseCurrency, fxRates]);

  const money = useMemo(
    () => (value: number | null | undefined, currency = baseCurrency, decimals?: number) =>
      formatMoney(value, currency, currencyDisplay, decimals),
    [baseCurrency, currencyDisplay]);

  // % of portfolio = this row's Total Value / sum of all rows' Total Values, both
  // converted to the base currency so a mixed-currency portfolio still adds to 100%.
  // Denominator = all holdings, not the filtered view.
  const portfolioPercents = useMemo(() => {
    if (!holdings?.length) return {} as Record<string, number>;
    const inBase = holdings.map((h) => [h.ticker, toBase(holdingTotalValue(h), h.currency)] as const);
    const total = inBase.reduce((s, [, v]) => s + v, 0);
    if (total === 0) return {} as Record<string, number>;
    return Object.fromEntries(inBase.map(([ticker, v]) => [ticker, (v / total) * 100]));
  }, [holdings, toBase]);

  const sortedHoldings = useMemo(() => {
    return [...filteredHoldings].sort((a, b) => {
      let valA: number | string | null;
      let valB: number | string | null;
      if (orderBy === 'currentShareValue') {
        // compare in the base currency — raw natives would rank by quote unit
        valA = toBase(holdingTotalValue(a), a.currency);
        valB = toBase(holdingTotalValue(b), b.currency);
      } else if (orderBy === 'dividend') {
        valA = toBase((a.dividend ?? 0) * (a.shareAmount ?? 0), a.currency);
        valB = toBase((b.dividend ?? 0) * (b.shareAmount ?? 0), b.currency);
      } else if (orderBy === 'portfolioPercent') {
        valA = portfolioPercents[a.ticker] ?? 0;
        valB = portfolioPercents[b.ticker] ?? 0;
      } else {
        valA = (a as unknown as Record<string, unknown>)[orderBy] as number | string | null;
        valB = (b as unknown as Record<string, unknown>)[orderBy] as number | string | null;
      }
      if (valA == null && valB == null) return 0;
      if (valA == null) return order === 'asc' ? -1 : 1;
      if (valB == null) return order === 'asc' ? 1 : -1;
      if (typeof valA === 'number' && typeof valB === 'number')
        return order === 'asc' ? valA - valB : valB - valA;
      return order === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
  }, [filteredHoldings, orderBy, order, portfolioPercents, toBase]);

  // Aggregates: each holding is converted from its own currency to the base one.
  const stats = useMemo(() => {
    if (!holdings?.length) return null;
    const totalValue  = holdings.reduce((s, h) => s + toBase(holdingTotalValue(h), h.currency), 0);
    const totalCost   = holdings.reduce((s, h) => s + toBase(holdingCostBasis(h), h.currency), 0);
    const totalProfit = holdings.reduce((s, h) => s + toBase(h.totalProfit ?? 0, h.currency), 0);
    const avgYield    = holdings.reduce((s, h) => s + (h.dividendYield ?? 0), 0) / holdings.length;
    return { totalValue, totalCost, totalProfit, avgYield };
  }, [holdings, toBase]);

  // Manual cash converted to the portfolio's base currency.
  const cashInBase = useMemo(
    () => (manualCash ?? []).reduce((s, c) => s + toBase(c.amount, c.currency), 0),
    [manualCash, toBase]);

  // Distinct months of the value chart, ascending — options for the start-month select
  const chartMonths = useMemo(() => {
    const months = [...new Set((valueHistory ?? []).map((p) => p.date.slice(0, 7)))];
    months.sort();
    return months;
  }, [valueHistory]);

  const effectiveChartStart = rangeStartMonth(chartRange, chartMonths);

  const changeChartRange = (range: ChartRange) => {
    settingsDirtyRef.current = true;
    setChartRange(range);
    updatePortfolioSettings(pid, { chartRange: range });
  };

  // Realized P&L (per currency from backend) converted to the base currency —
  // keeps profit from fully-sold positions visible after their holding is deleted
  const realizedInBase = useMemo(
    () => Object.entries(realizedByCcy ?? {}).reduce((s, [ccy, amt]) => s + toBase(amt, ccy), 0),
    [realizedByCcy, toBase]);

  const submitCashDialog = async () => {
    if (!cashDialog) return;
    const currency = cashDialog.currency.trim().toUpperCase();
    const amount = Number(cashDialog.amount);
    if (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(amount)) return;
    await saveCash({ currency, amount });
    setCashDialog(null);
  };

  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns]);

  const renderCell = (holding: Holding, col: Column): React.ReactNode => {
    switch (col.key) {
      case 'ticker':
        return (
          <div
            className="flex items-center gap-3 cursor-pointer group/ticker"
            onClick={() => setDetailHolding(holding)}
          >
            <StockLogo ticker={holding.ticker} name={holding.name} assetType={holding.assetType} />
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover/ticker:text-indigo-600 dark:group-hover/ticker:text-indigo-400 transition-colors">
                {holding.ticker}
              </div>
              {holding.name && holding.assetType === 'CUSTOM' && (
                <div title={holding.name ?? undefined} className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">{holding.name}</div>
              )}
            </div>
          </div>
        );
      case 'shareAmount':
        return <span className="font-mono tabular-nums">{holding.shareAmount < 1 ? holding.shareAmount.toFixed(4) : holding.shareAmount}</span>;
      case 'costPerShare':
        return <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">{money(holding.costPerShare, holding.currency)}</span>;
      case 'currentShareValue': {
        const total = holdingTotalValue(holding);
        return (
          <div>
            <div className="font-semibold tabular-nums">{money(total, holding.currency)}</div>
            <div className="text-[11px] text-slate-400 tabular-nums">{money(holding.currentShareValue, holding.currency)}/sh</div>
          </div>
        );
      }
      case 'portfolioPercent': {
        const pct = portfolioPercents[holding.ticker];
        if (pct == null) return <span className="text-slate-400 dark:text-slate-500">—</span>;
        return <span className="font-semibold tabular-nums">{formatPercent(pct, 1)}</span>;
      }
      case 'dividend':
        return <span className="font-mono tabular-nums">{money((holding.dividend ?? 0) * holding.shareAmount, holding.currency)}</span>;
      case 'dividendYield':
        return (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatPercent(holding.dividendYield)}
          </span>
        );
      case 'dividendYieldOnCost':
        return <span className="text-slate-500 dark:text-slate-400 tabular-nums">{formatPercent(holding.dividendYieldOnCost)}</span>;
      case 'totalProfit': {
        const profit = holding.totalProfit;
        const pct = holding.totalProfitPercentage;
        const pos = (profit ?? 0) >= 0;
        return (
          <div className={pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
            <div className="font-semibold tabular-nums">{money(profit, holding.currency)}</div>
            <div className="text-[11px] tabular-nums opacity-85">{formatPercent(pct)}</div>
          </div>
        );
      }
      case 'dailyChange': {
        const change = holding.dailyChange;
        const pos = (change ?? 0) >= 0;
        return <span className={`font-semibold tabular-nums ${pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{money(change, holding.currency)}</span>;
      }
      default:
        return String((holding as unknown as Record<string, unknown>)[col.key] ?? '—');
    }
  };

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading holdings" message={(error as Error).message} />;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-[13px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors self-start"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Portfolios
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            title="Portfolio settings"
            className="inline-flex items-center gap-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings className="h-3.5 w-3.5 text-slate-400" />
            Settings
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-slate-400" />
            Import
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Transaction
          </button>
        </div>
      </div>

      {/* KPI stat cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="relative group h-full">
            <StatCard
              label={`Total Value${baseCurrency ? ` (${baseCurrency})` : ''}`}
              value={money(stats.totalValue + cashInBase)}
              icon={TrendingUp}
              accent="#4F46E5"
              sub={cashInBase !== 0 ? 'incl. cash' : undefined}
            />
            {cashInBase !== 0 && (
              <div className="absolute left-0 top-full mt-1.5 z-30 hidden group-hover:block w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-lg">
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Portfolio value</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {money(stats.totalValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500 dark:text-slate-400">Cash</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {money(cashInBase)}
                  </span>
                </div>
                {(manualCash ?? []).map((c) => (
                  <div key={c.currency} className="flex items-center justify-between text-[12px] pl-3 mt-0.5">
                    <span className="text-slate-400 dark:text-slate-500">{c.currency}</span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">
                      {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-[13px] mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Total</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {money(stats.totalValue + cashInBase)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <StatCard
            label={`Cost Basis${baseCurrency ? ` (${baseCurrency})` : ''}`}
            value={money(stats.totalCost)}
            icon={DollarSign}
            accent="#14B8A6"
          />
          <div className="relative group h-full">
            <StatCard
              label={`Total P&L${baseCurrency ? ` (${baseCurrency})` : ''}`}
              value={money(stats.totalProfit + realizedInBase)}
              icon={BarChart2}
              accent={stats.totalProfit + realizedInBase >= 0 ? '#10B981' : '#EF4444'}
              sub={realizedInBase !== 0 ? 'incl. realized' : undefined}
            />
            {realizedInBase !== 0 && (
              <div className="absolute left-0 top-full mt-1.5 z-30 hidden group-hover:block w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-lg">
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">Unrealized</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {money(stats.totalProfit)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-500 dark:text-slate-400">Realized</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {money(realizedInBase)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px] mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Total</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {money(stats.totalProfit + realizedInBase)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <StatCard
            label="Avg Yield"
            value={formatPercent(stats.avgYield)}
            icon={Percent}
            accent="#8B5CF6"
          />
        </div>
      )}

      {/* Manual cash holdings */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white">Cash Holdings</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">Updated manually — counted in Total Value, not in charts</div>
          </div>
          <button
            onClick={() => setCashDialog({ currency: '', amount: '' })}
            className="inline-flex items-center gap-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Cash
          </button>
        </div>
        {(manualCash ?? []).length === 0 ? (
          <div className="text-[13px] text-slate-400 dark:text-slate-500">No cash positions yet.</div>
        ) : (
          <div className="flex flex-wrap gap-5">
            {(manualCash ?? []).map((c) => (
              <div key={c.currency} className="flex items-center gap-3 min-w-[170px] group/cash">
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ width: 32, height: 32, background: '#4F46E51A' }}
                >
                  <Wallet className="h-4 w-4" style={{ color: '#4F46E5' }} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{c.currency}</div>
                  <div className="text-[16px] font-semibold tabular-nums text-slate-900 dark:text-white">
                    {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover/cash:opacity-100 transition-opacity">
                  <button
                    onClick={() => setCashDialog({ currency: c.currency, amount: String(c.amount), isEdit: true })}
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="Edit amount"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void removeCash(c.currency)}
                    className="p-1 rounded text-slate-400 hover:text-red-500"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cash position */}
      {cashBalance && Object.keys(cashBalance).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white">Cash Position</div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {Object.keys(cashBalance).length} {Object.keys(cashBalance).length === 1 ? 'currency' : 'currencies'}
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            {Object.entries(cashBalance).map(([currency, amount]) => (
              <div key={currency} className="flex items-center gap-3 min-w-[140px]">
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ width: 32, height: 32, background: amount >= 0 ? '#14B8A61A' : '#EF44441A' }}
                >
                  <Banknote className="h-4 w-4" style={{ color: amount >= 0 ? '#14B8A6' : '#EF4444' }} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{currency}</div>
                  <div className={`text-[16px] font-semibold tabular-nums ${amount < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                    {amount < 0 ? '-' : ''}{currency} {Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio value chart */}
      {holdings && holdings.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Portfolio Value Over Time</div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">
                {baseCurrency ? `All currencies converted to ${baseCurrency} at today's rate` : 'All currencies converted to base'}
              </div>
            </div>
            {chartMonths.length > 1 && (
              <div className="inline-flex items-center bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md p-0.5">
                {CHART_RANGES.map((range) => (
                  <button
                    key={range}
                    onClick={() => changeChartRange(range)}
                    className={`px-2.5 py-1 rounded text-[12px] font-semibold transition-colors ${
                      chartRange === range
                        ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="h-56">
            <PortfolioValueChart
              portfolioId={pid}
              startMonth={effectiveChartStart}
              baseCurrency={baseCurrency}
              currencyDisplay={currencyDisplay}
            />
          </div>
        </div>
      )}

      {/* Holdings table */}
      {holdings?.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No holdings yet"
          description="Add a transaction to get started."
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Table header with filter chips */}
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[14px] font-semibold text-slate-900 dark:text-white">Holdings</div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400">Sorted by {orderBy}</div>
            </div>
            {holdings && holdings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(['ALL', ...Object.keys(assetFilterCounts)] as (AssetType | 'ALL')[]).map((type) => {
                  const isActive = assetFilter === type;
                  const chipColor = type !== 'ALL' ? ASSET_CHIP_COLORS[type] ?? ASSET_CHIP_COLORS.CUSTOM : '';
                  return (
                    <button
                      key={type}
                      onClick={() => changeAssetFilter(type)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary text-white'
                          : `${chipColor || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'} hover:opacity-80`
                      }`}
                    >
                      {type}
                      <span className={`rounded-full px-1.5 py-px text-[10px] ${isActive ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'}`}>
                        {type === 'ALL' ? holdings.length : assetFilterCounts[type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors whitespace-nowrap border-b border-slate-200 dark:border-slate-700"
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {orderBy === col.key && (
                          order === 'asc'
                            ? <ArrowUp className="h-3 w-3 text-indigo-500" />
                            : <ArrowDown className="h-3 w-3 text-indigo-500" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {sortedHoldings.map((holding) => (
                  <tr key={holding.ticker} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5 text-[13px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {renderCell(holding, col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateTransactionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => { await createTransaction(payload); setCreateOpen(false); }}
        isPending={creating}
        portfolioId={pid}
      />
      <ImportTransactionsModal open={importOpen} onClose={() => setImportOpen(false)} portfolioId={pid} />

      <Dialog
        open={cashDialog !== null}
        onClose={() => setCashDialog(null)}
        title={cashDialog?.isEdit ? `Edit Cash — ${cashDialog.currency}` : 'Add Cash'}
        maxWidth="sm"
      >
        {cashDialog && (
          <form
            onSubmit={(e) => { e.preventDefault(); void submitCashDialog(); }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Currency</label>
              <input
                type="text"
                value={cashDialog.currency}
                onChange={(e) => setCashDialog({ ...cashDialog, currency: e.target.value.toUpperCase() })}
                placeholder="USD"
                maxLength={3}
                pattern="[A-Za-z]{3}"
                required
                disabled={cashDialog.isEdit}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-[14px] text-slate-900 dark:text-white uppercase disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={cashDialog.amount}
                onChange={(e) => setCashDialog({ ...cashDialog, amount: e.target.value })}
                placeholder="0.00"
                required
                autoFocus
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-[14px] text-slate-900 dark:text-white tabular-nums"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCashDialog(null)}
                className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCash}
                className="rounded-md bg-primary px-3 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {savingCash ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </Dialog>
      <HoldingDetailDialog holding={detailHolding} open={detailHolding !== null} onClose={() => setDetailHolding(null)} portfolioId={pid} />

      <PortfolioSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        columns={columns}
        onToggleColumn={toggleColumn}
        onMoveColumn={moveColumn}
        sortBy={orderBy}
        sortOrder={order}
        onSortChange={applySort}
        assetFilter={assetFilter}
        assetTypes={Object.keys(assetFilterCounts)}
        onAssetFilterChange={changeAssetFilter}
        baseCurrency={baseCurrency || 'USD'}
        onBaseCurrencyChange={changeBaseCurrency}
        heldCurrencies={heldCurrencies}
        currencyDisplay={currencyDisplay}
        onCurrencyDisplayChange={changeCurrencyDisplay}
        previewValue={(stats?.totalValue ?? 0) + cashInBase}
        onReset={resetSettings}
      />
    </div>
  );
}
