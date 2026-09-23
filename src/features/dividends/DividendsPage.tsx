import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TrendingUp, CalendarDays, Clock, BarChart2, BarChart as BarChartIcon } from 'lucide-react';
import { useDividends } from '../../hooks/useDividends';
import { useHoldings } from '../../hooks/useHoldings';
import { useTransactions } from '../../hooks/useTransactions';
import { usePortfolioCurrency } from '../../hooks/usePortfolioCurrency';
import { currencyMeta, looksLikePenceQuote } from '../../lib/currency';
import { monthIndexOf, parseLocalDate, quarterOf as quarterOfMonthKey, yearOf } from '../../lib/dates';
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

// Neutral fill for de-emphasized bars while a quarter is hovered.
// Semi-transparent slate reads as "dimmed" on both light and dark card backgrounds.
const DIMMED_BAR = 'rgba(148, 163, 184, 0.35)';

// Fixed color per calendar month, same every year (Jan 24 and Jan 25 match).
// Three shades of each quarter's hue, so months stay in their quarter's family.
const MONTH_COLORS = [
  '#93C5FD', '#3B82F6', '#1D4ED8', // Jan Feb Mar — blues   (Q1)
  '#5EEAD4', '#14B8A6', '#0F766E', // Apr May Jun — teals   (Q2)
  '#FCD34D', '#F59E0B', '#B45309', // Jul Aug Sep — ambers  (Q3)
  '#C4B5FD', '#8B5CF6', '#6D28D9', // Oct Nov Dec — violets (Q4)
];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `'yyyy-MM'`, the key amountByMonth uses (DividendUtils.YEAR_MONTH_FORMATTER); `month` is 0-based */
const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;
/** the month key `by` months away (negative = earlier) */
const shiftMonth = (key: string, by: number) => {
  const i = yearOf(key) * 12 + monthIndexOf(key) + by;
  return monthKey(Math.floor(i / 12), i % 12);
};
/** keys of `count` consecutive months starting at `month` (0-based) of `year` */
const monthsFrom = (year: number, month: number, count: number) =>
  Array.from({ length: count }, (_, i) => shiftMonth(monthKey(year, month), i));
/** 'Sep 2025' — the axis's 'Sep 25' reads like a day of the month inside a sentence */
const monthName = (key: string) => `${MONTH_LABELS[monthIndexOf(key)]} ${yearOf(key)}`;

/** The % change line of an income tooltip: the hovered period against the same period a year earlier. */
type Change = {
  pct: number;
  /** the period compared against, as the tooltip names it: '2024', 'Q3 2024', 'Apr 2024' */
  vs: string;
  /** months of `vs` it was measured on while the hovered period is still running ('Jan–Aug'); null = all of it */
  months: string | null;
};

/** What the income tooltip reads off a bar; each chart adds its own axis key. */
type IncomeBar = {
  amount: number;
  title: string;
  /** YTD / QTD / MTD while the period is still running */
  tag: string | null;
  change: Change | null;
};

/**
 * Tooltip of the Income by Year / Quarter / Month cards: the period's income and
 * its % change on the same period a year earlier. Passed as an element, so
 * Recharts clones it with `active`/`payload` filled in.
 */
function IncomeTooltip({ active, payload, format }: {
  active?: boolean;
  payload?: { payload?: IncomeBar }[];
  format: (value: number) => string;
}) {
  const bar = payload?.[0]?.payload;
  if (!active || !bar) return null;
  const { change } = bar;
  // rounded before the sign is read, so -0.04% prints as 0.0%, not -0.0%
  const pct = change ? Math.round(change.pct * 10) / 10 : 0;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[13px] shadow-sm">
      <div className="font-semibold text-slate-900 dark:text-white">
        {bar.title}
        {bar.tag && (
          <span className="ml-1.5 text-[9.5px] font-bold tracking-wider text-slate-400 dark:text-slate-500">{bar.tag}</span>
        )}
      </div>
      <div className="tabular-nums text-slate-700 dark:text-slate-200">{format(bar.amount)}</div>
      {change && (
        <div className="tabular-nums">
          <span className={`font-semibold ${
            pct > 0 ? 'text-emerald-600 dark:text-emerald-400'
              : pct < 0 ? 'text-red-600 dark:text-red-400'
                : 'text-slate-500 dark:text-slate-400'
          }`}>
            {pct > 0 ? '+' : pct < 0 ? '-' : ''}{Math.abs(pct).toFixed(1)}%
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {' '}vs {change.vs}{change.months && ` (${change.months})`}
          </span>
        </div>
      )}
    </div>
  );
}

export default function DividendsPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { data, isLoading, error } = useDividends(portfolioId!);
  const { data: holdings } = useHoldings(portfolioId!);
  // This year's transactions — the same React Query cache the Transactions page
  // fills ('transactions', portfolioId, year), so switching pages costs no fetch.
  const { data: yearTransactions } = useTransactions(portfolioId!, new Date().getFullYear());
  // The API reports every dividend in the currency it was paid in; the portfolio's
  // base currency (Portfolio Settings) decides what this page adds them up in.
  const { baseCurrency, toBase, sumToBase, money } = usePortfolioCurrency(
    portfolioId!, (holdings ?? []).map((h) => h.currency ?? ''));
  // Hovered quarter ("Q1".."Q4") — same quarter highlights across all years, rest dims
  const [hoverQuarter, setHoverQuarter] = useState<string | null>(null);
  // Hovered calendar month (0-11) — same month highlights across all years, rest dims
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading dividends" message={(error as Error).message} />;

  // Projection: per-currency natives summed into the base currency. Older
  // responses only carry the flat total, tagged with displayCurrency.
  const yearly = data?.projectionByCurrency
    ? sumToBase(data.projectionByCurrency)
    : toBase(data?.yearlyCombineDividendsProjection ?? 0, data?.displayCurrency);

  // Monthly income: one native series per currency, converted then merged.
  const amountByMonth: Record<string, number> = {};
  if (data?.amountByMonthByCurrency) {
    for (const [ccy, months] of Object.entries(data.amountByMonthByCurrency)) {
      for (const [month, amount] of Object.entries(months)) {
        amountByMonth[month] = (amountByMonth[month] ?? 0) + toBase(Number(amount) || 0, ccy);
      }
    }
  } else {
    for (const [month, amount] of Object.entries(data?.amountByMonth ?? {})) {
      amountByMonth[month] = toBase(Number(amount) || 0, data?.displayCurrency);
    }
  }

  const tickerCurrency = data?.tickerCurrency ?? {};
  const tickerAmountArr = (data?.tickerAmount ?? []).map((entry) =>
    Object.fromEntries(Object.entries(entry).map(([ticker, amount]) =>
      [ticker, toBase(Number(amount) || 0, tickerCurrency[ticker] ?? data?.displayCurrency)])));

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

  const sym = currencyMeta(baseCurrency).symbol;

  const monthly = yearly / 12;
  const daily = yearly / 365;
  const hourly = daily / 24;

  // --- What the last transaction batch did to the projection -----------------
  // A batch is every transaction sharing the newest date in this year's list:
  // an imported statement lands as one date, a hand-entered trade is a batch of
  // one. Only share moves shift the projection, and they shift it by exactly
  // what the backend projects with — annual DPS x quantity, in the ticker's own
  // (MarketData) currency, converted here like every other figure on the page.
  // A ticker sold out completely has no holding left to read a DPS from, so its
  // SELL contributes nothing — the projection it used to carry is simply gone.
  const dayOf = (t: { date?: string | null }) => String(t.date ?? '').slice(0, 10);
  const lastBatchDate = (yearTransactions ?? []).reduce(
    (max, t) => (dayOf(t) > max ? dayOf(t) : max), '');
  const lastBatch = lastBatchDate
    ? (yearTransactions ?? []).filter((t) => dayOf(t) === lastBatchDate)
    : [];

  const holdingByTicker = new Map((holdings ?? []).map((h) => [h.ticker, h]));
  const batchYearlyDelta = lastBatch.reduce((sum, t) => {
    const sign = t.transactionType === 'BUY' ? 1 : t.transactionType === 'SELL' ? -1 : 0;
    if (!sign) return sum; // DIVIDEND/TAX/DEPOSIT/WITHDRAWAL move no shares
    const h = holdingByTicker.get(t.ticker);
    const dps = Number(h?.dividend) || 0;
    if (!dps) return sum; // non-payer, crypto, custom asset or sold out
    // MarketData currency, not the transaction's: a .L payer quotes dividends in
    // pence while the trade books in GBP.
    const ccy = tickerCurrency[t.ticker]
      ?? (looksLikePenceQuote(t.ticker, h?.currency) ? 'GBp' : h?.currency);
    return sum + toBase(sign * (Number(t.quantity) || 0) * dps, ccy);
  }, 0);

  const batchTitle = `Last transaction batch: ${lastBatch.length} transaction${
    lastBatch.length === 1 ? '' : 's'} on ${lastBatchDate}`;
  /** the batch's share of one card's figure, in "(+$1.23)" form; null when it moved nothing */
  const batchDelta = (perYear: number, decimals: number) => {
    const d = batchYearlyDelta / perYear;
    if (!d) return null;
    return (
      <span
        title={batchTitle}
        className={`text-[13px] font-semibold tabular-nums ${
          d > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        }`}
      >
        ({d > 0 ? '+' : '-'}{sym}{Math.abs(d).toFixed(decimals)})
      </span>
    );
  };

  // Tooltip comparison: % change of a period (its month keys) on the same months
  // a year earlier — Q3 2025 against Q3 2024, Apr 2025 against Apr 2024. A period
  // still running is measured on its finished months only, against those same
  // months last year: a part period against a whole one would read as a cut. No
  // finished month yet (a running month; January for a year), or nothing paid a
  // year earlier (the first year of all), leaves nothing to compare.
  const now = new Date();
  const thisMonth = monthKey(now.getFullYear(), now.getMonth());
  const paidIn = (keys: string[]) => keys.reduce((sum, key) => sum + (amountByMonth[key] ?? 0), 0);
  const changeOn = (months: string[], vs: string): Change | null => {
    const done = months.filter((m) => m < thisMonth);
    const base = paidIn(done.map((m) => shiftMonth(m, -12)));
    if (!done.length || base <= 0) return null;
    const [first, last] = [done[0], done[done.length - 1]].map((m) => MONTH_LABELS[monthIndexOf(m)]);
    return {
      pct: (paidIn(done) / base - 1) * 100,
      vs,
      months: done.length === months.length ? null : first === last ? first : `${first}–${last}`,
    };
  };

  // By year — numeric sort
  const byYearMap = Object.entries(amountByMonth).reduce<Record<string, number>>((acc, [month, amount]) => {
    // Keys are 'yyyy-MM' (DividendUtils.YEAR_MONTH_FORMATTER). Read the calendar
    // fields off the string: new Date('2024-01') is UTC midnight, which reads back
    // as December 2023 in any timezone west of UTC.
    const year = String(yearOf(month));
    acc[year] = (acc[year] ?? 0) + (Number(amount) || 0);
    return acc;
  }, {});
  const byYear = Object.entries(byYearMap)
    .map(([year, amount]) => {
      const months = monthsFrom(Number(year), 0, 12);
      return {
        year,
        amount: parseFloat(amount.toFixed(2)),
        title: year,
        tag: months.includes(thisMonth) ? 'YTD' : null,
        change: changeOn(months, String(Number(year) - 1)),
      };
    })
    .sort((a, b) => Number(a.year) - Number(b.year));

  // By quarter — structured sort by year then quarter number
  const byQuarterMap = Object.entries(amountByMonth).reduce<Record<string, number>>((acc, [month, amount]) => {
    const key = `${yearOf(month)} Q${quarterOfMonthKey(month)}`;
    acc[key] = (acc[key] ?? 0) + (Number(amount) || 0);
    return acc;
  }, {});
  const byQuarter = Object.entries(byQuarterMap)
    .map(([yearQuarter, amount]) => {
      const [year, q] = yearQuarter.split(' Q').map(Number);
      const months = monthsFrom(year, (q - 1) * 3, 3);
      return {
        yearQuarter,
        amount: parseFloat(amount.toFixed(2)),
        title: `Q${q} ${year}`,
        tag: months.includes(thisMonth) ? 'QTD' : null,
        change: changeOn(months, `Q${q} ${year - 1}`),
      };
    })
    .sort((a, b) => {
      const [aYear, aQ] = a.yearQuarter.split(' Q').map(Number);
      const [bYear, bQ] = b.yearQuarter.split(' Q').map(Number);
      return aYear !== bYear ? aYear - bYear : aQ - bQ;
    });

  // By month — formatted label for X-axis. 'yyyy-MM' keys sort as text.
  const byMonth = Object.entries(amountByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month: parseLocalDate(month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      amount: parseFloat(Number(amount).toFixed(2)),
      m: monthIndexOf(month),
      title: monthName(month),
      tag: month === thisMonth ? 'MTD' : null,
      change: changeOn([month], monthName(shiftMonth(month, -12))),
    }));

  const incomeTooltip = <IncomeTooltip format={(v) => money(v, baseCurrency)} />;

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
        <StatCard label="Yearly Projection" value={`${sym}${yearly.toFixed(2)}`}   icon={TrendingUp}  accent="#4F46E5" extra={batchDelta(1, 2)}    sub={lastBatchDate ? `Last batch ${lastBatchDate}` : undefined} />
        <StatCard label="Monthly Average"   value={`${sym}${monthly.toFixed(2)}`}  icon={CalendarDays} accent="#14B8A6" extra={batchDelta(12, 2)}   sub="Projected" />
        <StatCard label="Daily Average"     value={`${sym}${daily.toFixed(2)}`}    icon={BarChart2}    accent="#10B981" extra={batchDelta(365, 2)}  sub="Calendar daily" />
        <StatCard label="Hourly Average"    value={`${sym}${hourly.toFixed(4)}`}   icon={Clock}        accent="#8B5CF6" extra={batchDelta(8760, 4)} sub="While you sleep" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {byYear.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Income by Year</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">All-time history</div>
            <div className="h-64">
              <AppBarChart
                data={byYear}
                xKey="year"
                color="#4F46E5"
                currencySymbol={sym}
                tooltipContent={incomeTooltip}
              />
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
                  <span
                    key={q}
                    onMouseEnter={() => setHoverQuarter(q)}
                    onMouseLeave={() => setHoverQuarter(null)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold cursor-default transition-opacity ${
                      hoverQuarter && hoverQuarter !== q ? 'opacity-40' : ''
                    } text-slate-500 dark:text-slate-400`}
                  >
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
                tooltipContent={incomeTooltip}
                getBarColor={(entry) => {
                  const q = quarterOf(String(entry.yearQuarter));
                  if (hoverQuarter && q !== hoverQuarter) return DIMMED_BAR;
                  return QUARTER_COLORS[q];
                }}
                onBarHover={(entry) =>
                  setHoverQuarter(entry ? quarterOf(String(entry.yearQuarter)) : null)
                }
                // every lit bar prints its own quarter's income, so hovering Q1 2024
                // lets you read Q1 across all years at once
                getBarLabel={(entry) =>
                  (hoverQuarter && quarterOf(String(entry.yearQuarter)) === hoverQuarter
                    ? money(Number(entry.amount), baseCurrency, 0)
                    : null)
                }
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
                  <span
                    key={mL}
                    onMouseEnter={() => setHoverMonth(i)}
                    onMouseLeave={() => setHoverMonth(null)}
                    className={`inline-flex items-center gap-1 text-[10.5px] font-semibold cursor-default transition-opacity ${
                      hoverMonth != null && hoverMonth !== i ? 'opacity-40' : ''
                    } text-slate-500 dark:text-slate-400`}
                  >
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
                tooltipContent={incomeTooltip}
                getBarColor={(entry) => {
                  const m = Number(entry.m);
                  if (hoverMonth != null && m !== hoverMonth) return DIMMED_BAR;
                  return MONTH_COLORS[m];
                }}
                onBarHover={(entry) => setHoverMonth(entry ? Number(entry.m) : null)}
                getBarLabel={(entry) =>
                  (hoverMonth != null && Number(entry.m) === hoverMonth
                    ? money(Number(entry.amount), baseCurrency, 0)
                    : null)
                }
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
