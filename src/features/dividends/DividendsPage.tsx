import { useParams } from 'react-router-dom';
import { TrendingUp, CalendarDays, Clock, BarChart2, BarChart as BarChartIcon } from 'lucide-react';
import { useDividends } from '../../hooks/useDividends';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import AppBarChart from '../../components/charts/BarChart';

export default function DividendsPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { data, isLoading, error } = useDividends(portfolioId!);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading dividends" message={(error as Error).message} />;
  if (!data || Object.keys(data).length === 0) {
    return <EmptyState icon={BarChartIcon} title="No dividend data" description="Dividend data is not available for this portfolio." />;
  }

  const yearly = data.yearlyCombineDividendsProjection ?? 0;
  const monthly = yearly / 12;
  const daily = yearly / 365;
  const hourly = daily / 24;

  const amountByMonth = data.amountByMonth ?? {};
  const tickerAmountArr = data.tickerAmount ?? [];

  // By year
  const byYearMap = Object.entries(amountByMonth).reduce<Record<string, number>>((acc, [month, amount]) => {
    const year = String(new Date(month).getFullYear());
    acc[year] = (acc[year] ?? 0) + (parseFloat(String(amount)) || 0);
    return acc;
  }, {});
  const byYear = Object.entries(byYearMap)
    .map(([year, amount]) => ({ year, amount: parseFloat(amount.toFixed(2)) }))
    .sort((a, b) => a.year.localeCompare(b.year));

  // By quarter
  const byQuarterMap = Object.entries(amountByMonth).reduce<Record<string, number>>((acc, [month, amount]) => {
    const d = new Date(month);
    const key = `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
    acc[key] = (acc[key] ?? 0) + (parseFloat(String(amount)) || 0);
    return acc;
  }, {});
  const byQuarter = Object.entries(byQuarterMap)
    .map(([yearQuarter, amount]) => ({ yearQuarter, amount: parseFloat(amount.toFixed(2)) }))
    .sort((a, b) => a.yearQuarter.localeCompare(b.yearQuarter));

  // By month
  const byMonth = Object.entries(amountByMonth)
    .map(([month, amount]) => ({ month, amount: parseFloat(parseFloat(String(amount)).toFixed(2)) }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // By stock
  const tickerMap = tickerAmountArr.reduce<Record<string, number>>((acc, obj) => ({ ...acc, ...obj }), {});
  const byStock = Object.entries(tickerMap)
    .map(([ticker, amount]) => ({ ticker, amount: parseFloat(parseFloat(String(amount)).toFixed(2)) }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Projections */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Stock Dividends Projection</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Yearly Projection" value={`$${yearly.toFixed(2)}`} icon={TrendingUp} />
          <StatCard label="Monthly Average" value={`$${monthly.toFixed(2)}`} icon={CalendarDays} iconColor="bg-purple-500" />
          <StatCard label="Daily Average" value={`$${daily.toFixed(2)}`} icon={BarChart2} iconColor="bg-emerald-500" />
          <StatCard label="Hourly Average" value={`$${hourly.toFixed(4)}`} icon={Clock} iconColor="bg-amber-500" />
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Charts */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Dividends Analysis</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {byYear.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Dividends By Year</h3>
              <div className="h-72">
                <AppBarChart data={byYear} xKey="year" color="#6366f1" />
              </div>
            </div>
          )}

          {byQuarter.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Dividends By Quarter</h3>
              <div className="h-72">
                <AppBarChart data={byQuarter} xKey="yearQuarter" color="#8b5cf6" />
              </div>
            </div>
          )}

          {byMonth.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 p-6 lg:col-span-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Dividends By Month</h3>
              <div className="h-72">
                <AppBarChart data={byMonth} xKey="month" color="#ec4899" />
              </div>
            </div>
          )}

          {byStock.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 p-6 lg:col-span-2">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">All Time Dividends By Stock</h3>
              <div className="h-80">
                <AppBarChart data={byStock} xKey="ticker" color="#3b82f6" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
