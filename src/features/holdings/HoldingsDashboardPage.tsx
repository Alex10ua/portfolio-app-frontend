import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Upload, Settings, ArrowUp, ArrowDown,
  TrendingUp, DollarSign, BarChart2, Percent, LayoutGrid, Banknote, GripVertical,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useHoldings, useFirstTradeYear, useCreateTransaction, useCashBalance } from '../../hooks/useHoldings';
import { getFxRates } from '../../api/fxRates';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import Dialog from '../../components/ui/Dialog';
import CreateTransactionDialog from './CreateTransactionDialog';
import ImportTransactionsModal from './ImportTransactionsModal';
import HoldingDetailDialog from './HoldingDetailDialog';
import PortfolioValueChart from './PortfolioValueChart';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import StockLogo from '../../components/ui/StockLogo';
import type { AssetType, Holding } from '../../types/holding';

type SortOrder = 'asc' | 'desc';

interface Column {
  key: string;
  label: string;
  visible: boolean;
}

const DEFAULT_COLUMNS: Column[] = [
  { key: 'ticker',              label: 'Holding',      visible: true  },
  { key: 'shareAmount',         label: 'Shares',       visible: true  },
  { key: 'costPerShare',        label: 'Cost/Share',   visible: true  },
  { key: 'currentShareValue',   label: 'Total Value',  visible: true  },
  { key: 'portfolioPercent',    label: '% of Portfolio', visible: true },
  { key: 'dividend',            label: 'Dividends',    visible: true  },
  { key: 'dividendYield',       label: 'Yield',        visible: true  },
  { key: 'dividendYieldOnCost', label: 'Yield on Cost',visible: true  },
  { key: 'totalProfit',         label: 'Total P&L',    visible: true  },
  { key: 'dailyChange',         label: 'Daily Change', visible: true  },
];

function mergeColumns(saved: Column[]): Column[] {
  const defaults = new Map(DEFAULT_COLUMNS.map((c) => [c.key, c]));
  // Saved order wins; drop keys that no longer exist, take labels from defaults.
  const merged = saved
    .filter((c) => defaults.has(c.key))
    .map((c) => ({ ...defaults.get(c.key)!, visible: c.visible }));
  // Insert columns added since the config was saved at their default position.
  DEFAULT_COLUMNS.forEach((def, i) => {
    if (!merged.some((c) => c.key === def.key)) merged.splice(Math.min(i, merged.length), 0, def);
  });
  return merged;
}

// Single source for the "Total Value" figure — used by the column, sorting, and % of Portfolio.
const holdingTotalValue = (h: Holding) => (h.currentShareValue ?? 0) * h.shareAmount;

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
  const { data: fxRates = {} } = useQuery({ queryKey: ['fxRates'], queryFn: getFxRates });

  const [createOpen, setCreateOpen]   = useState(false);
  const [importOpen, setImportOpen]   = useState(false);
  const [configOpen, setConfigOpen]   = useState(false);
  const [detailHolding, setDetailHolding] = useState<Holding | null>(null);
  const [orderBy, setOrderBy]         = useState<string>('ticker');
  const [order, setOrder]             = useState<SortOrder>('asc');
  const [assetFilter, setAssetFilter] = useState<AssetType | 'ALL'>('ALL');

  const [columns, setColumns] = useState<Column[]>(() => {
    const saved = localStorage.getItem(`tableConfig-${pid}`);
    if (saved) {
      try { return mergeColumns(JSON.parse(saved) as Column[]); } catch { /* ignore */ }
    }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(`tableConfig-${pid}`, JSON.stringify(columns));
  }, [columns, pid]);

  useEffect(() => {
    if (firstTradeYear) localStorage.setItem('firstTradeYear', String(firstTradeYear));
  }, [firstTradeYear]);

  const handleSort = (key: string) => {
    if (orderBy === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setOrderBy(key); setOrder('asc'); }
  };

  const [dragKey, setDragKey] = useState<string | null>(null);

  const moveColumn = (fromKey: string, toKey: string) => {
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

  // % of portfolio = this row's Total Value / sum of all rows' Total Values,
  // using raw native-currency values exactly as shown in the Total Value column.
  // Denominator = all holdings, not the filtered view.
  const portfolioPercents = useMemo(() => {
    if (!holdings?.length) return {} as Record<string, number>;
    const total = holdings.reduce((s, h) => s + holdingTotalValue(h), 0);
    if (total === 0) return {} as Record<string, number>;
    return Object.fromEntries(holdings.map((h) => [h.ticker, (holdingTotalValue(h) / total) * 100]));
  }, [holdings]);

  const sortedHoldings = useMemo(() => {
    return [...filteredHoldings].sort((a, b) => {
      let valA: number | string | null;
      let valB: number | string | null;
      if (orderBy === 'currentShareValue') {
        valA = holdingTotalValue(a);
        valB = holdingTotalValue(b);
      } else if (orderBy === 'dividend') {
        valA = (a.dividend ?? 0) * (a.shareAmount ?? 0);
        valB = (b.dividend ?? 0) * (b.shareAmount ?? 0);
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
  }, [filteredHoldings, orderBy, order, portfolioPercents]);

  const { baseCurrency, stats } = useMemo(() => {
    if (!holdings?.length) return { baseCurrency: '', stats: null };
    const uniqueCurrencies = [...new Set(holdings.map((h) => h.currency).filter((c): c is string => !!c))];
    const isMulti = uniqueCurrencies.length > 1;
    // Multi-currency portfolio → display in USD; mono-currency → that currency.
    const base = isMulti ? 'USD' : (uniqueCurrencies[0] ?? '');
    // toBase converts native → EUR (fx = rateVsEur); displayRate then EUR → USD.
    const toBase = (v: number, fx?: number) => isMulti && fx && fx !== 0 ? v / fx : v;
    const displayRate = isMulti ? (fxRates['USD'] ?? 1) : 1;
    const totalValue  = holdings.reduce((s, h) => s + toBase((h.currentShareValue ?? 0) * h.shareAmount, h.fxRate), 0) * displayRate;
    const totalCost   = holdings.reduce((s, h) => s + toBase((h.costPerShare ?? 0) * h.shareAmount, h.fxRate), 0) * displayRate;
    const totalProfit = holdings.reduce((s, h) => s + toBase(h.totalProfit ?? 0, h.fxRate), 0) * displayRate;
    const avgYield    = holdings.reduce((s, h) => s + (h.dividendYield ?? 0), 0) / holdings.length;
    return { baseCurrency: base, stats: { totalValue, totalCost, totalProfit, avgYield } };
  }, [holdings, fxRates]);

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
                <div className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">{holding.name}</div>
              )}
            </div>
          </div>
        );
      case 'shareAmount':
        return <span className="font-mono tabular-nums">{holding.shareAmount < 1 ? holding.shareAmount.toFixed(4) : holding.shareAmount}</span>;
      case 'costPerShare':
        return <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">{formatCurrency(holding.costPerShare, undefined, holding.currency)}</span>;
      case 'currentShareValue': {
        const total = holdingTotalValue(holding);
        return (
          <div>
            <div className="font-semibold tabular-nums">{formatCurrency(total, undefined, holding.currency)}</div>
            <div className="text-[11px] text-slate-400 tabular-nums">{formatCurrency(holding.currentShareValue, undefined, holding.currency)}/sh</div>
          </div>
        );
      }
      case 'portfolioPercent': {
        const pct = portfolioPercents[holding.ticker];
        if (pct == null) return <span className="text-slate-400 dark:text-slate-500">—</span>;
        return <span className="font-semibold tabular-nums">{formatPercent(pct, 1)}</span>;
      }
      case 'dividend':
        return <span className="font-mono tabular-nums">{formatCurrency((holding.dividend ?? 0) * holding.shareAmount, undefined, holding.currency)}</span>;
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
            <div className="font-semibold tabular-nums">{formatCurrency(profit, undefined, holding.currency)}</div>
            <div className="text-[11px] tabular-nums opacity-85">{formatPercent(pct)}</div>
          </div>
        );
      }
      case 'dailyChange': {
        const change = holding.dailyChange;
        const pos = (change ?? 0) >= 0;
        return <span className={`font-semibold tabular-nums ${pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{formatCurrency(change, undefined, holding.currency)}</span>;
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
            onClick={() => setConfigOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings className="h-3.5 w-3.5 text-slate-400" />
            Columns
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
          <StatCard
            label={`Total Value${baseCurrency ? ` (${baseCurrency})` : ''}`}
            value={formatCurrency(stats.totalValue, undefined, baseCurrency)}
            icon={TrendingUp}
            accent="#4F46E5"
          />
          <StatCard
            label={`Cost Basis${baseCurrency ? ` (${baseCurrency})` : ''}`}
            value={formatCurrency(stats.totalCost, undefined, baseCurrency)}
            icon={DollarSign}
            accent="#14B8A6"
          />
          <StatCard
            label={`Total P&L${baseCurrency ? ` (${baseCurrency})` : ''}`}
            value={formatCurrency(stats.totalProfit, undefined, baseCurrency)}
            icon={BarChart2}
            accent={stats.totalProfit >= 0 ? '#10B981' : '#EF4444'}
          />
          <StatCard
            label="Avg Yield"
            value={formatPercent(stats.avgYield)}
            icon={Percent}
            accent="#8B5CF6"
          />
        </div>
      )}

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
          <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Portfolio Value Over Time</div>
          <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">All currencies converted to base</div>
          <div className="h-56">
            <PortfolioValueChart portfolioId={pid} />
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
                      onClick={() => setAssetFilter(type)}
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
      <HoldingDetailDialog holding={detailHolding} open={detailHolding !== null} onClose={() => setDetailHolding(null)} portfolioId={pid} />

      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} title="Column Configuration">
        <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-2">Drag to reorder columns</div>
        <div className="space-y-1">
          {columns.map((col) => {
            const isLastVisible = col.visible && visibleColumns.length === 1;
            return (
              <div
                key={col.key}
                draggable
                onDragStart={() => setDragKey(col.key)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragKey && dragKey !== col.key) moveColumn(dragKey, col.key);
                }}
                onDrop={(e) => e.preventDefault()}
                onDragEnd={() => setDragKey(null)}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 border transition-colors ${
                  dragKey === col.key
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 opacity-70'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <GripVertical className="h-4 w-4 text-slate-400 dark:text-slate-500 cursor-grab flex-shrink-0" />
                <label className={`flex items-center gap-3 flex-1 cursor-pointer ${isLastVisible ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <input
                    type="checkbox"
                    checked={col.visible}
                    disabled={isLastVisible}
                    onChange={() => toggleColumn(col.key)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{col.label}</span>
                </label>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => setConfigOpen(false)}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
            Done
          </button>
        </div>
      </Dialog>
    </div>
  );
}
