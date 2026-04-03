import { useParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useDividendCalendar } from '../../hooks/useDividendCalendar';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DividendCalendarPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { data, isLoading, error } = useDividendCalendar(portfolioId!);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading dividend calendar" message={(error as Error).message} />;
  if (!data || Object.keys(data).length === 0) {
    return <EmptyState icon={CalendarDays} title="No dividend calendar" description="Dividend calendar data is not available." />;
  }

  // 12-month heatmap: sum per calendar month for the current year
  const currentYear = new Date().getFullYear();
  const monthlyTotals = Array(12).fill(0) as number[];
  Object.entries(data).forEach(([month, dividends]) => {
    const d = new Date(month);
    if (d.getFullYear() === currentYear) {
      const total = dividends.reduce((s, div) => s + (div.dividendAmount ?? 0) * (div.stockQuantity ?? 0), 0);
      monthlyTotals[d.getMonth()] += total;
    }
  });
  const maxMonthly = Math.max(...monthlyTotals, 0.01);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Dividend Calendar</h1>

      {/* 12-month income heatmap */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          {currentYear} Monthly Income
        </h2>
        <div className="grid grid-cols-12 gap-2">
          {monthlyTotals.map((total, i) => {
            const intensity = maxMonthly > 0 ? total / maxMonthly : 0;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-md transition-all"
                  style={{
                    height: '48px',
                    background: `rgba(99, 102, 241, ${Math.max(0.08, intensity)})`,
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}
                  title={`${MONTHS[i]}: $${total.toFixed(2)}`}
                />
                <span className="text-xs text-slate-500">{MONTHS[i]}</span>
                {total > 0 && <span className="text-xs font-medium text-indigo-600">${total.toFixed(0)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month cards */}
      <div className="space-y-6">
        {Object.entries(data).map(([month, dividends]) => {
          const totalMonth = dividends.reduce((s, d) => s + (d.dividendAmount ?? 0) * (d.stockQuantity ?? 0), 0);
          return (
            <div key={month} className="bg-white dark:bg-slate-900 shadow-sm rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-6 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{month}</h3>
                <span className="inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Total: ${totalMonth.toFixed(2)}
                </span>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dividends.map((div, idx) => {
                    const total = ((div.dividendAmount ?? 0) * (div.stockQuantity ?? 0)).toFixed(2);
                    return (
                      <div
                        key={`${div.ticker}-${idx}`}
                        className="relative rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 flex items-center gap-3 hover:border-indigo-400 transition-colors"
                      >
                        <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <img
                            className="h-8 w-8 rounded-full"
                            src={`/images/${div.ticker}_icon.png`}
                            alt={div.ticker}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{div.ticker}</p>
                          <p className="text-xs text-slate-500">
                            {div.stockQuantity} shares @ ${(div.dividendAmount ?? 0).toFixed(2)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-green-600 shrink-0">${total}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
