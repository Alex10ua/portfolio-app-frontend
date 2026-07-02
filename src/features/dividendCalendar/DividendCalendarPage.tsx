import { useParams } from 'react-router-dom';
import StockLogo from '../../components/ui/StockLogo';
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

function toTitleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// Vertical bar: fill height = month total relative to the best month
// (100% = highest-paying month of the year, 0% = no income).
function MonthBar({ total, maxMonthly, isCurrent, height, label }: {
  total: number;
  maxMonthly: number;
  isCurrent: boolean;
  height: number;
  label: string;
}) {
  const pct = maxMonthly > 0 ? (total / maxMonthly) * 100 : 0;
  // keep non-zero months visible even when tiny
  const fillPct = total > 0 ? Math.max(pct, 4) : 0;
  return (
    <div
      className={`relative w-full rounded-md bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 overflow-hidden ${
        isCurrent ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : ''
      }`}
      style={{ height }}
      title={`${label}: $${total.toFixed(2)} (${Math.round(pct)}% of best month)`}
    >
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all"
        style={{ height: `${fillPct}%`, background: 'linear-gradient(180deg, #818CF8, #4F46E5)' }}
      />
    </div>
  );
}

function DividendCard({ div }: { div: DividendCalendarEntry }) {
  const total = ((div.dividendAmount ?? 0) * (div.stockQuantity ?? 0)).toFixed(2);
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4 flex items-center gap-3 hover:border-indigo-400 transition-colors">
      <StockLogo ticker={div.ticker} size="lg" />
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
  const annualTotal = monthlyTotals.reduce((s, v) => s + v, 0);

  // Sort month cards chronologically by month index
  const sortedEntries = Object.entries(data).sort(
    ([a], [b]) => (MONTH_NAME_TO_INDEX[a] ?? 0) - (MONTH_NAME_TO_INDEX[b] ?? 0),
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 12-month income bars */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-0.5">Monthly Income</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">Bar height = % of best month</div>
          </div>
          {annualTotal > 0 && (
            <div className="text-right shrink-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-0.5">Annual Total</div>
              <div className="text-[18px] font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">${annualTotal.toFixed(2)}</div>
            </div>
          )}
        </div>

        {/* Desktop: all 12 months in one row */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-2">
          {monthlyTotals.map((total, i) => {
            const isCurrent = i === currentMonth;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <MonthBar total={total} maxMonthly={maxMonthly} isCurrent={isCurrent} height={96} label={MONTHS[i]} />
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

        {/* Mobile: 2 rows of 6 */}
        <div className="grid grid-cols-6 gap-2 sm:hidden">
          {monthlyTotals.map((total, i) => {
            const isCurrent = i === currentMonth;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <MonthBar total={total} maxMonthly={maxMonthly} isCurrent={isCurrent} height={64} label={MONTHS[i]} />
                <span className={`text-xs ${isCurrent ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {MONTHS[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Month cards */}
      <div className="space-y-4">
        {sortedEntries.map(([month, dividends]) => {
          const totalMonth = dividends.reduce((s, d) => s + (d.dividendAmount ?? 0) * (d.stockQuantity ?? 0), 0);
          return (
            <div key={month} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-3.5 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{toTitleCase(month)}</div>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 tabular-nums">
                  ${totalMonth.toFixed(2)}
                </span>
              </div>
              <div className="p-5">
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
