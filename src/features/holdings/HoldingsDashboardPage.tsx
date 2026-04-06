import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Upload, Settings, ArrowUp, ArrowDown,
  TrendingUp, DollarSign, BarChart2, Percent, LayoutGrid,
} from 'lucide-react';
import { useHoldings, useFirstTradeYear, useCreateTransaction } from '../../hooks/useHoldings';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import Dialog from '../../components/ui/Dialog';
import CreateTransactionDialog from './CreateTransactionDialog';
import ImportTransactionsModal from './ImportTransactionsModal';
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
  { key: 'ticker',             label: 'Holding',       visible: true  },
  { key: 'shareAmount',        label: 'Shares',         visible: true  },
  { key: 'costPerShare',       label: 'Cost/Share',     visible: true  },
  { key: 'currentShareValue',  label: 'Total Value',    visible: true  },
  { key: 'dividend',           label: 'Dividends',      visible: true  },
  { key: 'dividendYield',      label: 'Yield',          visible: true  },
  { key: 'dividendYieldOnCost',label: 'Yield on Cost',  visible: true  },
  { key: 'totalProfit',        label: 'Total Profit',   visible: true  },
  { key: 'dailyChange',        label: 'Daily Change',   visible: true  },
];

// Merge saved config with defaults so new columns are never lost
function mergeColumns(saved: Column[]): Column[] {
  const savedMap = new Map(saved.map((c) => [c.key, c]));
  return DEFAULT_COLUMNS.map((def) =>
    savedMap.has(def.key) ? { ...def, visible: savedMap.get(def.key)!.visible } : def,
  );
}

export default function HoldingsDashboardPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const pid = portfolioId!;

  const { data: holdings, isLoading, error } = useHoldings(pid);
  const { data: firstTradeYear } = useFirstTradeYear(pid);
  const { mutateAsync: createTransaction, isPending: creating } = useCreateTransaction(pid);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [orderBy, setOrderBy] = useState<string>('ticker');
  const [order, setOrder] = useState<SortOrder>('asc');
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
    if (orderBy === key) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(key);
      setOrder('asc');
    }
  };

  const toggleColumn = (key: string) => {
    setColumns((prev) => {
      const visibleCount = prev.filter((c) => c.visible).length;
      return prev.map((c) => {
        if (c.key !== key) return c;
        // Prevent hiding the last visible column
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

  const sortedHoldings = useMemo(() => {
    if (!filteredHoldings) return [];
    return [...filteredHoldings].sort((a, b) => {
      let valA: number | string | null;
      let valB: number | string | null;

      // Sort by the displayed value, not the raw stored value
      if (orderBy === 'currentShareValue') {
        valA = (a.currentShareValue ?? 0) * (a.shareAmount ?? 0);
        valB = (b.currentShareValue ?? 0) * (b.shareAmount ?? 0);
      } else if (orderBy === 'dividend') {
        valA = (a.dividend ?? 0) * (a.shareAmount ?? 0);
        valB = (b.dividend ?? 0) * (b.shareAmount ?? 0);
      } else {
        valA = (a as unknown as Record<string, unknown>)[orderBy] as number | string | null;
        valB = (b as unknown as Record<string, unknown>)[orderBy] as number | string | null;
      }

      if (valA == null && valB == null) return 0;
      if (valA == null) return order === 'asc' ? -1 : 1;
      if (valB == null) return order === 'asc' ? 1 : -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return order === 'asc' ? valA - valB : valB - valA;
      }
      const cmp = String(valA).localeCompare(String(valB));
      return order === 'asc' ? cmp : -cmp;
    });
  }, [filteredHoldings, orderBy, order]);

  const stats = useMemo(() => {
    if (!holdings?.length) return null;
    const totalValue = holdings.reduce((s, h) => s + (h.currentShareValue ?? 0) * h.shareAmount, 0);
    const totalCost  = holdings.reduce((s, h) => s + (h.costPerShare ?? 0) * h.shareAmount, 0);
    const totalProfit = holdings.reduce((s, h) => s + (h.totalProfit ?? 0), 0);
    const totalDivYield = holdings.reduce((s, h) => s + (h.dividendYield ?? 0), 0) / holdings.length;
    return { totalValue, totalCost, totalProfit, avgYield: totalDivYield };
  }, [holdings]);

  const visibleColumns = useMemo(() => columns.filter((c) => c.visible), [columns]);

  const renderCell = (holding: Holding, col: Column): React.ReactNode => {
    switch (col.key) {
      case 'ticker':
        return (
          <div className="flex items-center gap-3">
            <StockLogo ticker={holding.ticker} name={holding.name} assetType={holding.assetType} />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">{holding.ticker}</div>
              {holding.name && holding.assetType === 'CUSTOM' && (
                <div className="text-xs text-slate-400 dark:text-slate-500">{holding.name}</div>
              )}
            </div>
          </div>
        );
      case 'costPerShare':
        return formatCurrency(holding.costPerShare);
      case 'currentShareValue': {
        const total = (holding.currentShareValue ?? 0) * holding.shareAmount;
        return (
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(total)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Price: {formatCurrency(holding.currentShareValue)}</div>
          </div>
        );
      }
      case 'dividend':
        return formatCurrency((holding.dividend ?? 0) * holding.shareAmount);
      case 'dividendYield':
        return (
          <span className="inline-flex items-center rounded-md bg-green-50 dark:bg-green-900/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/20">
            {formatPercent(holding.dividendYield)}
          </span>
        );
      case 'dividendYieldOnCost':
        return formatPercent(holding.dividendYieldOnCost);
      case 'totalProfit': {
        const profit = holding.totalProfit;
        const pct = holding.totalProfitPercentage;
        const isPos = (profit ?? 0) >= 0;
        return (
          <div className={isPos ? 'text-green-600' : 'text-red-600'}>
            <span className="font-medium">{formatCurrency(profit)}</span>
            <span className="ml-1 text-xs">({formatPercent(pct)})</span>
          </div>
        );
      }
      case 'dailyChange': {
        const change = holding.dailyChange;
        return <span className={(change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(change)}</span>;
      }
      default:
        return String((holding as unknown as Record<string, unknown>)[col.key] ?? 'N/A');
    }
  };

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading holdings" message={(error as Error).message} />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-2 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Portfolios
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Portfolio Holdings</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setConfigOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Settings className="h-4 w-4 text-slate-400" />
            Columns
          </button>
          <button onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">
            <Upload className="h-4 w-4 text-slate-400" />
            Import
          </button>
          <button onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
            <Plus className="h-4 w-4" />
            New Transaction
          </button>
        </div>
      </div>

      {/* Asset type filter chips */}
      {holdings && holdings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(['ALL', ...Object.keys(assetFilterCounts)] as (AssetType | 'ALL')[]).map((type) => (
            <button
              key={type}
              onClick={() => setAssetFilter(type)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                assetFilter === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {type}
              {type !== 'ALL' && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                  assetFilter === type ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  {assetFilterCounts[type]}
                </span>
              )}
              {type === 'ALL' && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                  assetFilter === 'ALL' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  {holdings.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Summary stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Value" value={formatCurrency(stats.totalValue)} icon={TrendingUp} />
          <StatCard label="Cost Basis" value={formatCurrency(stats.totalCost)} icon={DollarSign} iconColor="bg-slate-500" />
          <StatCard
            label="Total P&L"
            value={formatCurrency(stats.totalProfit)}
            icon={BarChart2}
            iconColor={stats.totalProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}
          />
          <StatCard label="Avg Yield" value={formatPercent(stats.avgYield)} icon={Percent} iconColor="bg-purple-500" />
        </div>
      )}

      {/* Holdings table */}
      {holdings?.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No holdings yet"
          description="Create a transaction to add your first holding to this portfolio."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {orderBy === col.key && (
                          order === 'asc'
                            ? <ArrowUp className="h-3 w-3 text-indigo-500" />
                            : <ArrowDown className="h-3 w-3 text-indigo-500" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {sortedHoldings.map((holding) => (
                  <tr key={holding.ticker} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
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

      {/* Create transaction dialog */}
      <CreateTransactionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          await createTransaction(payload);
          setCreateOpen(false);
        }}
        isPending={creating}
        portfolioId={pid}
      />

      {/* Import modal */}
      <ImportTransactionsModal open={importOpen} onClose={() => setImportOpen(false)} portfolioId={pid} />

      {/* Column config dialog */}
      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} title="Column Configuration">
        <div className="space-y-2">
          {columns.map((col) => {
            const isLastVisible = col.visible && visibleColumns.length === 1;
            return (
              <label
                key={col.key}
                className={`flex items-center gap-3 cursor-pointer ${isLastVisible ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  disabled={isLastVisible}
                  onChange={() => toggleColumn(col.key)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{col.label}</span>
              </label>
            );
          })}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => setConfigOpen(false)}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            Done
          </button>
        </div>
      </Dialog>
    </div>
  );
}
