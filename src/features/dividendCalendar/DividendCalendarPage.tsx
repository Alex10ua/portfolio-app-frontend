import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useDividendCalendar } from '../../hooks/useDividendCalendar';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import type { DividendCalendarEntry } from '../../types/dividendCalendar';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Backend returns uppercase Java Month enum names e.g. "JANUARY"
const MONTH_NAME_TO_INDEX: Record<string, number> = {
  JANUARY: 0, FEBRUARY: 1, MARCH: 2, APRIL: 3, MAY: 4, JUNE: 5,
  JULY: 6, AUGUST: 7, SEPTEMBER: 8, OCTOBER: 9, NOVEMBER: 10, DECEMBER: 11,
};

function DividendCard({ div }: { div: DividendCalendarEntry }) {
  const [imgError, setImgError] = useState(false);
  const total = ((div.dividendAmount ?? 0) * (div.stockQuantity ?? 0)).toFixed(2);
  return (
    <div className="relative rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4 flex items-center gap-3 hover:border-indigo-400 transition-colors">
      <div className="h-12 w-12 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
        {imgError ? (
          <span className="text-sm font-bold text-slate-500 dark:text-slate-300">
            {div.ticker.substring(0, 2)}
          </span>
        ) : (
          <img
            className="h-12 w-12 rounded-full object-cover"
            src={`/images/${div.ticker}_icon.png`}
            alt={div.ticker}
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{div.ticker}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {div.stockQuantity ?? 0} shares @ ${(div.dividendAmount ?? 0).toFixed(2)}
        </p>
      </div>
      <p className="text-sm font-semibold text-green-600 dark:text-green-400 shrink-0">${total}</p>
    </div>
  );
}

export default function DividendCalendarPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { data, isLoading, error } = useDividendCalendar(portfolioId!);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading dividend calendar" message={(error as Error).message} />;
  if (!data || Object.keys(data).length === 0) {
    return <EmptyState icon={CalendarDays} title="No dividend calendar" description="Dividend calendar data is not available." />;
  }

  const currentMonth = new Date().getMonth();

  // Keys are uppercase month names e.g. "JANUARY" — no year in the response
  const monthlyTotals = Array(12).fill(0) as number[];
  Object.entries(data).forEach(([month, dividends]) => {
    const idx = MONTH_NAME_TO_INDEX[month];
    if (idx !== undefined) {
      const total = dividends.reduce((s, div) => s + (div.dividendAmount ?? 0) * (div.stockQuantity ?? 0), 0);
      monthlyTotals[idx] += total;
    }
  });
  const maxMonthly = Math.max(...monthlyTotals, 0.01);

  // Sort month cards chronologically by month index
  const sortedEntries = Object.entries(data).sort(
    ([a], [b]) => (MONTH_NAME_TO_INDEX[a] ?? 0) - (MONTH_NAME_TO_INDEX[b] ?? 0),
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Dividend Calendar</h1>

      {/* 12-month income heatmap */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 p-6">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          Monthly Income
        </h2>
        <div className="grid grid-cols-12 gap-2">
          {monthlyTotals.map((total, i) => {
            const intensity = maxMonthly > 0 ? total / maxMonthly : 0;
            const isCurrent = i === currentMonth;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-md transition-all ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                  style={{
                    height: '48px',
                    background: `rgba(99, 102, 241, ${Math.max(0.08, intensity)})`,
                    border: `1px solid rgba(99, 102, 241, ${isCurrent ? 0.6 : 0.2})`,
                  }}
                  title={`${MONTHS[i]}: $${total.toFixed(2)}`}
                />
                <span className={`text-xs ${isCurrent ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {MONTHS[i]}
                </span>
                {total > 0 && (
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">${total.toFixed(0)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month cards */}
      <div className="space-y-6">
        {sortedEntries.map(([month, dividends]) => {
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
                  {dividends.map((div, idx) => (
                    <DividendCard key={`${div.ticker}-${idx}`} div={div} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
