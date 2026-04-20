import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, TrendingUp, DollarSign, BarChart2, Percent, ArrowUpDown } from 'lucide-react';
import { usePerformance } from '../../hooks/usePerformance';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import StatCard from '../../components/ui/StatCard';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import type { PerformancePeriod } from '../../types/performance';

const PERIODS: PerformancePeriod[] = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'];

function pnlColor(value: number | null | undefined) {
  if (value == null) return '';
  return value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';
}

function formatPnl(value: number | null | undefined, pct?: number | null) {
  if (value == null) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  const pctPart = pct != null ? ` (${sign}${formatPercent(pct)})` : '';
  return `${sign}${formatCurrency(value)}${pctPart}`;
}

export default function PerformancePage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const pid = portfolioId!;

  const [period, setPeriod] = useState<PerformancePeriod>('1Y');
  const { data, isLoading, error } = usePerformance(pid, period);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading performance data" message={(error as Error).message} />;

  const chartData = data?.timeSeries.map((p) => ({
    date: p.date,
    value: Number(p.portfolioValue),
  })) ?? [];

  const minVal = chartData.length ? Math.min(...chartData.map((d) => d.value)) * 0.98 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(`/${pid}`)}
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Performance & Returns</h1>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === p
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Portfolio value chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Portfolio Value</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">
            No price history available for this period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="perf-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                tickFormatter={(d) => {
                  const dt = new Date(d);
                  return `${dt.getMonth() + 1}/${dt.getDate()}/${String(dt.getFullYear()).slice(2)}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                domain={[minVal, 'auto']}
                tickFormatter={(v) => `$${(v as number).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Value']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#perf-gradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Primary summary cards */}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Total Invested"
              value={formatCurrency(data.totalInvested)}
              icon={DollarSign}
              iconColor="bg-slate-500"
            />
            <StatCard
              label="Current Value"
              value={formatCurrency(data.currentValue)}
              icon={TrendingUp}
            />
            <StatCard
              label="Total Return"
              value={formatPnl(data.totalReturn, data.totalReturnPct)}
              icon={BarChart2}
              iconColor={data.totalReturn >= 0 ? 'bg-green-500' : 'bg-red-500'}
            />
            <StatCard
              label="XIRR (Annualized)"
              value={formatPercent(data.xirr)}
              icon={Percent}
              iconColor={data.xirr >= 0 ? 'bg-indigo-500' : 'bg-red-500'}
            />
          </div>

          {/* Secondary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 px-6 py-5">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Unrealized P&L</p>
              <p className={`mt-1 text-2xl font-semibold ${pnlColor(data.unrealizedPnL)}`}>
                {formatPnl(data.unrealizedPnL, data.unrealizedPnLPct)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 px-6 py-5">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Realized P&L</p>
              <p className={`mt-1 text-2xl font-semibold ${pnlColor(data.realizedPnL)}`}>
                {formatPnl(data.realizedPnL)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 px-6 py-5">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Dividends</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                {formatCurrency(data.totalDividends)}
              </p>
            </div>
          </div>
        </>
      )}

      {!data && !isLoading && (
        <div className="text-center py-12 text-slate-400">
          <ArrowUpDown className="mx-auto h-10 w-10 mb-3" />
          <p>No performance data available. Add transactions to get started.</p>
        </div>
      )}
    </div>
  );
}
