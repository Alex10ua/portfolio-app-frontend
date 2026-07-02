import { useParams } from 'react-router-dom';
import { TrendingUp, CalendarDays, Clock, BarChart2, BarChart as BarChartIcon } from 'lucide-react';
import { useDividends } from '../../hooks/useDividends';
import { useHoldings } from '../../hooks/useHoldings';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import AppBarChart from '../../components/charts/BarChart';

// Fixed color per quarter number, same every year (Q1 2024 and Q1 2025 match).
// Hues picked to sit well with the app palette in both light and dark theme.
const QUARTER_COLORS: Record<string, string> = {
  Q1: '#3B82F6', // blue
  Q2: '#14B8A6', // teal
  Q3: '#F59E0B', // amber
  Q4: '#8B5CF6', // violet
};

const quarterOf = (yearQuarter: string) => yearQuarter.split(' ')[1] ?? '';

// Fixed color per calendar month, same every year (Jan 24 and Jan 25 match).
// Three shades of each quarter's hue, so months stay in their quarter's family.
const MONTH_COLORS = [
  '#93C5FD', '#3B82F6', '#1D4ED8', // Jan Feb Mar — blues   (Q1)
  '#5EEAD4', '#14B8A6', '#0F766E', // Apr May Jun — teals   (Q2)
  '#FCD34D', '#F59E0B', '#B45309', // Jul Aug Sep — ambers  (Q3)
  '#C4B5FD', '#8B5CF6', '#6D28D9', // Oct Nov Dec — violets (Q4)
];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DividendsPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { data, isLoading, error } = useDividends(portfolioId!);
  const { data: holdings } = useHoldings(portfolioId!);

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

  const displayCurrency = data?.displayCurrency ?? 'USD';
  const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CHF: 'CHF ', JPY: '¥' };
  const sym = CURRENCY_SYMBOLS[displayCurrency] ?? `${displayCurrency} `;

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
      return { month: label, amount: parseFloat(Number(amount).toFixed(2)), m: d.getMonth(), _date: d.getTime() };
    })
    .sort((a, b) => a._date - b._date)
    .map(({ month, amount, m }) => ({ month, amount, m }));

  // By stock — sorted descending by amount
  const tickerMap = tickerAmountArr.reduce<Record<string, number>>(
    (acc, obj) => Object.assign(acc, obj),
    {},
  );
  const byStock = Object.entries(tickerMap)
    .map(([ticker, amount]) => ({ ticker, amount: parseFloat(Number(amount).toFixed(2)) }))
    .filter((s) => s.amount > 0) // never paid dividends → not a payer, hide from charts
    .sort((a, b) => b.amount - a.amount);

  // Split payers into currently-held vs sold-off tickers
  const heldTickers = new Set(
    (holdings ?? []).filter((h) => (h.shareAmount ?? 0) > 0).map((h) => h.ticker),
  );
  const byStockCurrent = byStock.filter((s) => heldTickers.has(s.ticker));
  const byStockSold = byStock.filter((s) => !heldTickers.has(s.ticker));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* KPI projection row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Yearly Projection" value={`${sym}${yearly.toFixed(2)}`}   icon={TrendingUp}  accent="#4F46E5" />
        <StatCard label="Monthly Average"   value={`${sym}${monthly.toFixed(2)}`}  icon={CalendarDays} accent="#14B8A6" sub="Projected" />
        <StatCard label="Daily Average"     value={`${sym}${daily.toFixed(2)}`}    icon={BarChart2}    accent="#10B981" sub="Calendar daily" />
        <StatCard label="Hourly Average"    value={`${sym}${hourly.toFixed(4)}`}   icon={Clock}        accent="#8B5CF6" sub="While you sleep" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {byYear.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Income by Year</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">All-time history</div>
            <div className="h-64">
              <AppBarChart data={byYear} xKey="year" color="#4F46E5" currencySymbol={sym} />
            </div>
          </div>
        )}

        {byQuarter.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Income by Quarter</div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[12px] text-slate-500 dark:text-slate-400">All quarters</div>
              <div className="flex items-center gap-3">
                {Object.entries(QUARTER_COLORS).map(([q, c]) => (
                  <span key={q} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                    {q}
                  </span>
                ))}
              </div>
            </div>
            <div className="h-64">
              <AppBarChart
                data={byQuarter}
                xKey="yearQuarter"
                color="#14B8A6"
                currencySymbol={sym}
                getBarColor={(entry) => QUARTER_COLORS[quarterOf(String(entry.yearQuarter))]}
              />
            </div>
          </div>
        )}

        {byMonth.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm lg:col-span-2">
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Income by Month</div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="text-[12px] text-slate-500 dark:text-slate-400">Monthly breakdown</div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {MONTH_LABELS.map((mL, i) => (
                  <span key={mL} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-sm" style={{ background: MONTH_COLORS[i] }} />
                    {mL}
                  </span>
                ))}
              </div>
            </div>
            <div className="h-64">
              <AppBarChart
                data={byMonth}
                xKey="month"
                color="#4F46E5"
                currencySymbol={sym}
                getBarColor={(entry) => MONTH_COLORS[Number(entry.m)]}
              />
            </div>
          </div>
        )}

        {byStockCurrent.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm lg:col-span-2">
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Top Dividend Payers — Current Holdings</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">All time, by ticker (still held)</div>
            <div className="h-72">
              <AppBarChart data={byStockCurrent} xKey="ticker" color="#3B82F6" currencySymbol={sym} />
            </div>
          </div>
        )}

        {byStockSold.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm lg:col-span-2">
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Top Dividend Payers — Sold Holdings</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">All time, by ticker (no longer held)</div>
            <div className="h-72">
              <AppBarChart data={byStockSold} xKey="ticker" color="#94A3B8" currencySymbol={sym} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
