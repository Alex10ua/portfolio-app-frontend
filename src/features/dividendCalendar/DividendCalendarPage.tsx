import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import StockLogo from '../../components/ui/StockLogo';
import { useDividendCalendar } from '../../hooks/useDividendCalendar';
import { useHoldings, useFirstTradeYear } from '../../hooks/useHoldings';
import { useDividends } from '../../hooks/useDividends';
import { usePortfolioCurrency } from '../../hooks/usePortfolioCurrency';
import { looksLikePenceQuote, normalizeCurrency, toMajorUnits } from '../../lib/currency';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import type { DividendCalendarEntry, DividendCalendarData } from '../../types/dividendCalendar';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Payment {
  ticker: string;
  /** dividend per share, already in the major unit of `currency` */
  perShare: number;
  shares: number;
  /** native amount, i.e. perShare × shares */
  amount: number;
  /** amount converted to the portfolio's base currency */
  baseAmount: number;
  currency: string;
}

interface MonthBucket {
  index: number;
  label: string;
  short: string;
  payments: Payment[];
  /** base-currency total for the month */
  total: number;
  /** already paid — a closed year, or a month before this one */
  paid: boolean;
  current: boolean;
}

/** One payer, in its own quote currency — per-row figures are never converted. */
function PaymentCard({ payment, paid, money }: {
  payment: Payment;
  paid: boolean;
  money: (value: number, currency?: string, decimals?: number) => string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 bg-white dark:bg-slate-800 border transition-colors hover:border-indigo-400 ${
        paid
          ? 'border-slate-200 dark:border-slate-700'
          : 'border-dashed border-slate-300 dark:border-slate-600 opacity-75'
      }`}
    >
      <StockLogo ticker={payment.ticker} size="lg" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{payment.ticker}</p>
        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 tabular-nums">
          {formatShares(payment.shares)} {payment.shares === 1 ? 'share' : 'shares'} @{' '}
          {money(payment.perShare, payment.currency, 2)}
        </p>
      </div>
      <p
        className={`text-[13.5px] font-bold tabular-nums shrink-0 ${
          paid ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {money(payment.amount, payment.currency, 2)}
      </p>
    </div>
  );
}

/** Share counts come off ex-date maths, so they are fractional more often than not. */
function formatShares(shares: number): string {
  const rounded = Math.round(shares * 10000) / 10000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(4).replace(/0+$/, '');
}

function MonthSection({ month, year, currentYear, money }: {
  month: MonthBucket;
  year: number;
  currentYear: number;
  money: (value: number, currency?: string, decimals?: number) => string;
}) {
  const count = month.payments.length;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div
        className={`flex flex-wrap items-center gap-2.5 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 ${
          count ? 'border-b border-slate-200 dark:border-slate-700' : ''
        }`}
      >
        <span className="text-[13.5px] font-bold text-slate-900 dark:text-white">{month.label}</span>
        {month.current ? (
          <span className="text-[9.5px] font-bold uppercase tracking-[0.06em] rounded px-1.5 py-0.5 text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20">
            This month
          </span>
        ) : !month.paid && count ? (
          <span className="text-[9.5px] font-bold uppercase tracking-[0.06em] rounded px-1.5 py-px text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600">
            Scheduled
          </span>
        ) : null}
        {count > 0 && (
          <span className="text-[11.5px] text-slate-400 dark:text-slate-500 tabular-nums">
            {count} payment{count !== 1 ? 's' : ''}
          </span>
        )}
        <div className="flex-1" />
        {count > 0 && (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold tabular-nums bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
            {money(month.total)}
          </span>
        )}
      </div>
      {count > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {month.payments.map((payment, idx) => (
            <PaymentCard
              key={`${payment.ticker}-${idx}`}
              payment={payment}
              paid={month.paid || month.current}
              money={money}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-3.5 text-[12px] text-slate-400 dark:text-slate-500">
          No payments {year >= currentYear ? 'scheduled' : 'received'} this month
        </div>
      )}
    </div>
  );
}

/** 12 tiles, indigo opacity carrying the month total. */
function YearHeatmap({ months, currentIndex, money }: {
  months: MonthBucket[];
  currentIndex: number;
  money: (value: number, currency?: string, decimals?: number) => string;
}) {
  const max = Math.max(...months.map((m) => m.total), 0);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {months.map((m) => {
        const intensity = max > 0 ? m.total / max : 0;
        // Two ramps: the light theme starts near transparent, the dark one needs a
        // floor or an empty month disappears into the card.
        const light = `rgba(79, 70, 229, ${(0.06 + intensity * 0.7).toFixed(3)})`;
        const dark = `rgba(79, 70, 229, ${(0.15 + intensity * 0.65).toFixed(3)})`;
        const strong = intensity > 0.55;
        return (
          <div
            key={m.index}
            className={`relative rounded-lg p-3.5 min-h-[88px] border ${
              m.index === currentIndex
                ? 'border-2 border-indigo-600 dark:border-indigo-400'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            {/* the tint sits behind the text so one class set works in both themes */}
            <div
              className="absolute inset-0 rounded-lg dark:hidden"
              style={{ background: light }}
              aria-hidden
            />
            <div
              className="absolute inset-0 rounded-lg hidden dark:block"
              style={{ background: dark }}
              aria-hidden
            />
            <div className="relative">
              <div
                className={`text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 ${
                  strong ? 'text-white/90' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {m.short}
              </div>
              <div
                className={`text-[18px] font-semibold tabular-nums ${
                  strong ? 'text-white' : 'text-slate-900 dark:text-white'
                }`}
              >
                {money(m.total, undefined, 0)}
              </div>
              <div className={`text-[11px] mt-1 ${strong ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'}`}>
                {m.payments.length} payment{m.payments.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DividendCalendarPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId!;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // First selectable year, on the Transactions page's rule: the server's first
  // trade year, with the localStorage mirror covering the gap before it lands.
  const cachedFirst = parseInt(localStorage.getItem(`firstTradeYear-${pid}`) ?? String(currentYear), 10);
  const { data: firstTradeYear } = useFirstTradeYear(pid);
  const firstYear = Math.min(firstTradeYear ?? cachedFirst, currentYear);
  const yearOptions = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => firstYear + i);

  const [year, setYear] = useState(currentYear);
  // A year that fell outside the range once firstTradeYear landed (the cache said
  // "this year" on a portfolio that started earlier) still resolves — the backend
  // simply reports nothing for it — so no clamping effect is needed here.

  const { data, isLoading, error } = useDividendCalendar(pid, year);
  // Previous year, for the YoY line. Skipped entirely when there is none to compare.
  const hasPrevious = year - 1 >= firstYear;
  const { data: previousData } = useDividendCalendar(pid, year - 1, hasPrevious);

  const { data: holdings } = useHoldings(pid);
  const { data: dividendData } = useDividends(pid);
  const { toBase, money } = usePortfolioCurrency(pid, (holdings ?? []).map((h) => h.currency ?? ''));

  /**
   * The calendar DTO carries no currency. `DividendData.tickerCurrency` is the
   * authoritative one — it is `MarketData.currency`, the same document the
   * dividend amounts come from, and it covers tickers no longer held (a closed
   * year still lists them). The holding's currency plus the pence heuristic is
   * the fallback for a ticker that never reached that map.
   */
  const holdingCurrency = new Map(
    (holdings ?? []).map((h) => [h.ticker.toUpperCase(), h.currency ?? 'USD'] as const),
  );
  const marketCurrency = new Map(
    Object.entries(dividendData?.tickerCurrency ?? {}).map(([t, c]) => [t.toUpperCase(), c] as const),
  );

  const toPayment = (entry: DividendCalendarEntry): Payment => {
    const ticker = entry.ticker;
    const quoted = marketCurrency.get(ticker.toUpperCase());
    const fallback = holdingCurrency.get(ticker.toUpperCase()) ?? 'USD';
    // dividendAmount is quoted in MarketData's currency, so a London payer reports
    // pence against a GBP holding — bring it to major units before anything else.
    const perShare = quoted
      ? toMajorUnits(entry.dividendAmount ?? 0, quoted)
      : looksLikePenceQuote(ticker, fallback)
        ? (entry.dividendAmount ?? 0) / 100
        : (entry.dividendAmount ?? 0);
    const currency = normalizeCurrency(quoted ?? fallback);
    const shares = entry.stockQuantity ?? 0;
    const amount = perShare * shares;
    return { ticker, perShare, shares, amount, baseAmount: toBase(amount, currency), currency };
  };

  const bucketsOf = (calendar: DividendCalendarData | undefined, forYear: number): MonthBucket[] =>
    MONTHS.map((label, index) => {
      const key = label.toUpperCase();
      const payments = (calendar?.[key] ?? []).map(toPayment);
      return {
        index,
        label,
        short: label.slice(0, 3),
        payments,
        total: payments.reduce((sum, p) => sum + p.baseAmount, 0),
        paid: forYear < currentYear || (forYear === currentYear && index < currentMonth),
        current: forYear === currentYear && index === currentMonth,
      };
    });

  const months = bucketsOf(data, year);
  const annualTotal = months.reduce((sum, m) => sum + m.total, 0);
  const paymentCount = months.reduce((sum, m) => sum + m.payments.length, 0);
  const payerCount = new Set(months.flatMap((m) => m.payments.map((p) => p.ticker))).size;
  const payingMonths = months.filter((m) => m.payments.length > 0);
  const bestMonth = payingMonths.reduce<MonthBucket | null>(
    (best, m) => (!best || m.total > best.total ? m : best),
    null,
  );
  const averageMonth = payingMonths.length ? annualTotal / payingMonths.length : 0;

  const previousTotal = hasPrevious
    ? bucketsOf(previousData, year - 1).reduce((sum, m) => sum + m.total, 0)
    : 0;
  const delta = previousTotal > 0 ? ((annualTotal - previousTotal) / previousTotal) * 100 : null;

  const isCurrentYear = year === currentYear;
  const caption = isCurrentYear
    ? 'Paid to date · remaining months scheduled from last year’s payment pattern'
    : 'Closed year · payments valued on the shares held on each ex-date';

  const yearSelector = (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        Year
      </span>
      <div className="inline-flex items-center bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md p-0.5 overflow-x-auto max-w-full">
        {yearOptions.map((option) => (
          <button
            key={option}
            onClick={() => setYear(option)}
            className={`px-2.5 py-1 rounded text-[12px] font-semibold transition-colors shrink-0 ${
              option === year
                ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <span className="text-[11.5px] text-slate-400 dark:text-slate-500">{caption}</span>
    </div>
  );

  // The selector stays mounted through every state — a year with nothing in it
  // is a dead end otherwise, and switching years would flash the whole page.
  if (isLoading || error || paymentCount === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        {yearSelector}
        {isLoading ? (
          <FullPageSpinner />
        ) : error ? (
          <ErrorAlert title="Error loading dividend calendar" message={(error as Error).message} />
        ) : (
          <EmptyState
            icon={CalendarDays}
            title={`No dividends in ${year}`}
            description={
              isCurrentYear
                ? 'No payments have been recorded or scheduled for this year yet.'
                : 'No dividend was paid on a position held during this year.'
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {yearSelector}

      {/* Annual summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 rounded-lg border border-indigo-200 dark:border-indigo-900 p-5 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-200 dark:from-slate-800 dark:to-indigo-950">
          <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-indigo-600 dark:text-indigo-300 mb-2">
            {year} {isCurrentYear ? 'Paid & Scheduled' : 'Total Received'}
          </div>
          <div className="text-[38px] leading-none font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
            {money(annualTotal)}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[12px] text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">{paymentCount}</span> payments
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">{payerCount}</span> payers
            </div>
            {delta != null ? (
              <div>
                <span
                  className={`font-semibold ${
                    delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {delta >= 0 ? '+' : ''}
                  {delta.toFixed(1)}%
                </span>{' '}
                vs {year - 1}
              </div>
            ) : (
              <div>first tracked year</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mb-2">
            Highest month
          </div>
          <div className="text-[22px] font-semibold tabular-nums text-slate-900 dark:text-white">
            {bestMonth ? `${bestMonth.short} · ${money(bestMonth.total, undefined, 0)}` : '—'}
          </div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 mt-4 mb-1.5">
            Avg per paying month
          </div>
          <div className="text-[18px] font-semibold tabular-nums text-slate-900 dark:text-white">
            {money(averageMonth)}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white">{year} at a glance</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              Color intensity = total dividends in that month
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Less</span>
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((opacity) => (
              <div
                key={opacity}
                className="w-3.5 h-3.5 rounded-[3px]"
                style={{ background: `rgba(79, 70, 229, ${opacity})` }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
        <YearHeatmap months={months} currentIndex={isCurrentYear ? currentMonth : -1} money={money} />
      </div>

      {/* Every payment of the year, month by month */}
      <div className="space-y-4">
        {months.map((month) => (
          <MonthSection
            key={month.label}
            month={month}
            year={year}
            currentYear={currentYear}
            money={money}
          />
        ))}
      </div>
    </div>
  );
}
