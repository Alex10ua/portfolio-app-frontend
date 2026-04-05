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

  const yearly = data?.yearlyCombineDividendsProjection ?? 0;
  const amountByMonth = data?.amountByMonth ?? {};
  const tickerAmountArr = data?.tickerAmount ?? [];

  const hasData =
    yearly > 0 ||
    Object.keys(amountByMonth).length > 0 ||
    tickerAmountArr.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={BarChartIcon}
        title="No dividend data"
        description="Dividend data is not available for this portfolio."
      />
    );
  }

  const monthly = yearly / 12;
  const daily = yearly / 365;
  const hourly = daily / 24;

  // By year — numeric sort
  const byYearMap = Object.entries(amountByMonth).reduce<Record<string, number>>((acc, [month, amount]) => {
    const year = String(new Date(month).getFullYear());
    acc[year] = (acc[year] ?? 0) + (Number(amount) || 0);
    return acc;
  }, {});
  const byYear = Object.entries(byYearMap)
    .map(([year, amount]) => ({ year, amount: parseFloat(amount.toFixed(2)) }))
    .sort((a, b) => Number(a.year) - Number(b.year));

  // By quarter — structured sort by year then quarter number
  const byQuarterMap = Object.entries(amountByMonth).reduce<Record<string, number>>((acc, [month, amount]) => {
    const d = new Date(month);
    const key = `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
    acc[key] = (acc[key] ?? 0) + (Number(amount) || 0);
    return acc;
  }, {});
  const byQuarter = Object.entries(byQuarterMap)
    .map(([yearQuarter, amount]) => ({ yearQuarter, amount: parseFloat(amount.toFixed(2)) }))
    .sort((a, b) => {
      const [aYear, aQ] = a.yearQuarter.split(' Q').map(Number);
      const [bYear, bQ] = b.yearQuarter.split(' Q').map(Number);
      return aYear !== bYear ? aYear - bYear : aQ - bQ;
    });

  // By month — formatted label for X-axis
  const byMonth = Object.entries(amountByMonth)
    .map(([month, amount]) => {
      const d = new Date(month);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { month: label, amount: parseFloat(Number(amount).toFixed(2)), _date: d.getTime() };
    })
    .sort((a, b) => a._date - b._date)
    .map(({ month, amount }) => ({ month, amount }));

  // By stock — sorted descending by amount
  const tickerMap = tickerAmountArr.reduce<Record<string, number>>(
    (acc, obj) => Object.assign(acc, obj),
    {},
  );
  const byStock = Object.entries(tickerMap)
    .map(([ticker, amount]) => ({ ticker, amount: parseFloat(Number(amount).toFixed(2)) }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Projections */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Stock Dividends Projection</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Yearly Projection"  value={`$${yearly.toFixed(2)}`}   icon={TrendingUp} />
          <StatCard label="Monthly Average"    value={`$${monthly.toFixed(2)}`}  icon={CalendarDays} iconColor="bg-purple-500" />
          <StatCard label="Daily Average"      value={`$${daily.toFixed(2)}`}    icon={BarChart2}    iconColor="bg-emerald-500" />
          <StatCard label="Hourly Average"     value={`$${hourly.toFixed(4)}`}   icon={Clock}        iconColor="bg-amber-500" />
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
