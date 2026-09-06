import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, BarChart2, Percent, ArrowUpDown } from 'lucide-react';
import { usePerformance } from '../../hooks/usePerformance';
import { useHoldings } from '../../hooks/useHoldings';
import { usePortfolioCurrency } from '../../hooks/usePortfolioCurrency';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import StatCard from '../../components/ui/StatCard';
import { formatPercent } from '../../lib/formatters';
import { parseLocalDate } from '../../lib/dates';
import type { PerformancePeriod } from '../../types/performance';

const PERIODS: PerformancePeriod[] = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'];

function pnlColor(value: number | null | undefined) {
  if (value == null) return '';
  return value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';
}

/** `money` comes from the portfolio's currency settings — nothing here assumes USD. */
function formatPnl(
  value: number | null | undefined,
  money: (v: number | null | undefined) => string,
  pct?: number | null,
) {
  if (value == null) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  const pctPart = pct != null ? ` (${sign}${formatPercent(pct)})` : '';
  // money() writes its own minus sign, so only the '+' is added here
  return `${sign}${money(value)}${pctPart}`;
}

export default function PerformancePage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId!;

  const [period, setPeriod] = useState<PerformancePeriod>('1Y');
  const { data, isLoading, error } = usePerformance(pid, period);
  const { data: holdings } = useHoldings(pid);
  const { sumToBase, money, baseCurrency } = usePortfolioCurrency(pid, (holdings ?? []).map((h) => h.currency ?? ''));
  const cash = (v: number | null | undefined) => money(v, baseCurrency, 0);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading performance data" message={(error as Error).message} />;

  // Points carry each quote currency's own total — convert, then sum.
  const chartData = data?.timeSeries.map((p) => ({
    date: p.date,
    value: p.valueByCurrency ? sumToBase(p.valueByCurrency) : Number(p.portfolioValue),
  })) ?? [];

  const minVal = chartData.length ? Math.min(...chartData.map((d) => d.value)) * 0.98 : 0;

  // The summary figures are flat, unconverted native sums (no per-currency
  // breakdown exists on this DTO, unlike timeSeries.valueByCurrency), so they are
  // only exact while the portfolio holds one currency. Say so rather than
  // presenting a mixed sum as if it were converted.
  const heldCurrencies = [...new Set((holdings ?? []).map((h) => h.currency).filter(Boolean))];
  const mixedCurrency = heldCurrencies.length > 1;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Period selector */}
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 gap-0.5">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors ${
              period === p
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Portfolio value chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Portfolio Value</div>
        <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">Historical performance</div>
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
                  // local-midnight parse: new Date('2024-05-14') is UTC midnight and
                  // renders as the 13th in any timezone west of UTC
                  const dt = parseLocalDate(d);
                  return `${dt.getMonth() + 1}/${dt.getDate()}/${String(dt.getFullYear()).slice(2)}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                domain={[minVal, 'auto']}
                tickFormatter={(v) => cash(v as number)}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [money(value), 'Value']}
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
              value={money(data.totalInvested)}
              icon={DollarSign}
              accent="#64748B"
            />
            <StatCard
              label="Current Value"
              value={money(data.currentValue)}
              icon={TrendingUp}
              accent="#4F46E5"
            />
            <StatCard
              label="Total Return"
              value={formatPnl(data.totalReturn, money, data.totalReturnPct)}
              icon={BarChart2}
              accent={data.totalReturn >= 0 ? '#10B981' : '#EF4444'}
            />
            <StatCard
              label="XIRR (Annualized)"
              value={formatPercent(data.xirr)}
              icon={Percent}
              accent={data.xirr >= 0 ? '#4F46E5' : '#EF4444'}
            />
          </div>

          {/* Secondary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Unrealized P&L</div>
              <div className={`text-[20px] font-semibold tabular-nums ${pnlColor(data.unrealizedPnL)}`}>
                {formatPnl(data.unrealizedPnL, money, data.unrealizedPnLPct)}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Realized P&L</div>
              <div className={`text-[20px] font-semibold tabular-nums ${pnlColor(data.realizedPnL)}`}>
                {formatPnl(data.realizedPnL, money)}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Total Dividends</div>
              <div className="text-[20px] font-semibold tabular-nums text-slate-900 dark:text-white">
                {money(data.totalDividends)}
              </div>
            </div>
          </div>

          {mixedCurrency && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Summary figures are native sums shown in {baseCurrency}; this portfolio holds{' '}
              {heldCurrencies.join(', ')}, so only the chart above is FX-converted.
            </p>
          )}
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
