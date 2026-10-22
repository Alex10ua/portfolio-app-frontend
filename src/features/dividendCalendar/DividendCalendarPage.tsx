import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, Check, Inbox, Info } from 'lucide-react';
import Chip from '../../components/ui/Chip';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import { useDividendCalendar } from '../../hooks/useDividendCalendar';
import { useDividendReceipts, useSaveDividendReceipt } from '../../hooks/useDividendReceipts';
import { useHoldings, useFirstTradeYear } from '../../hooks/useHoldings';
import { usePortfolioCurrency } from '../../hooks/usePortfolioCurrency';
import { looksLikePenceQuote, normalizeCurrency, toMajorUnits } from '../../lib/currency';
import { parseLocalDate } from '../../lib/dates';
import { cn } from '../../lib/cn';
import CalendarRow, { formatWeekdayDate } from './CalendarRow';
import {
  GRACE_DAYS, NO_PAY_DATE_GRACE_DAYS, STATUSES, STATUS_LABEL,
  addDays, matchReceipts, naturalState, stateOf, toggledOverride, withholdingDefault,
  type CalendarPayment, type StatusFilter,
} from './calendarMath';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Money = (value: number, currency?: string, decimals?: number) => string;

interface MonthGroup {
  index: number;
  label: string;
  /** every payment listed under the month, sorted by pay date */
  rows: CalendarPayment[];
  /** the rows the status filter lets through */
  visible: CalendarPayment[];
  /** base-currency totals */
  total: number;
  received: number;
  current: boolean;
}

function TodayLine({ today }: { today: Date }) {
  return (
    <div className="flex h-[22px] items-center gap-2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-300" />
      <span className="whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.06em] text-indigo-600 dark:text-indigo-300">
        Today · {formatWeekdayDate(today)}
      </span>
      <span className="h-px flex-1 bg-indigo-600/40 dark:bg-indigo-300/40" />
    </div>
  );
}

/** Received / expected, in the portfolio's base currency. */
function MonthChip({ month, money }: { month: MonthGroup; money: Money }) {
  const some = month.received > 0;
  return (
    <span
      title="Received / expected this month"
      className={cn(
        'inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[12px] font-bold tabular-nums',
        some
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
          : 'border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-400/10',
      )}
    >
      <Check
        className={cn('h-3 w-3', some ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400')}
        strokeWidth={3}
      />
      <span className={some ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
        {money(month.received)}
      </span>
      <span className="font-semibold text-slate-500 dark:text-slate-400">/ {money(month.total)}</span>
    </span>
  );
}

function MonthBlock({ month, year, today, popped, money, onToggle, onSaveRate }: {
  month: MonthGroup;
  year: number;
  today: Date;
  popped: string | null;
  money: Money;
  onToggle: (p: CalendarPayment) => void;
  onSaveRate: (p: CalendarPayment, rate: number | null) => void;
}) {
  const rows = month.visible;
  // A "today" marker between what has paid and what is due. Rows sit under their
  // ex-date's month but sort by pay date, so last month's list can straddle today
  // too; the current month always shows it, even at either end.
  let todayAt = rows.findIndex((p) => p.anchor > today);
  if (!month.current && todayAt <= 0) todayAt = -1;
  else if (todayAt < 0) todayAt = rows.length;
  return (
    <section id={`cal-month-${month.index}`} className="flex scroll-mt-48 flex-col gap-2 lg:scroll-mt-20 lg:gap-3">
      <div className="flex flex-wrap items-center gap-2 px-0.5 lg:h-7 lg:flex-nowrap lg:gap-3 lg:px-0">
        <h3 className="whitespace-nowrap text-[15px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white lg:text-[19px]">
          {month.label} {year}
        </h3>
        {month.current && (
          <span className="whitespace-nowrap rounded bg-indigo-600/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            This month
          </span>
        )}
        <div className="flex-1 lg:hidden" />
        <MonthChip month={month} money={money} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:px-5 lg:py-0.5">
        {rows.map((p, i) => (
          <div key={p.key}>
            {i === todayAt && <TodayLine today={today} />}
            <CalendarRow
              payment={p}
              divider={i > 0 && i !== todayAt}
              popped={popped === p.key}
              money={money}
              onToggle={() => onToggle(p)}
              onSaveRate={(rate) => onSaveRate(p, rate)}
            />
          </div>
        ))}
        {todayAt === rows.length && <TodayLine today={today} />}
      </div>
    </section>
  );
}

export default function DividendCalendarPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId!;

  // Local midnight, fixed for the life of the page so every memo below stays put.
  const [today] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // First selectable year, on the Transactions page's rule: the server's first
  // trade year, with the localStorage mirror covering the gap before it lands.
  const cachedFirst = parseInt(localStorage.getItem(`firstTradeYear-${pid}`) ?? String(currentYear), 10);
  const { data: firstTradeYear } = useFirstTradeYear(pid);
  const firstYear = Math.min(firstTradeYear ?? cachedFirst, currentYear);
  // One year past this one: the backend projects it end to end from the trailing
  // payment pattern.
  const yearOptions = Array.from({ length: currentYear + 1 - firstYear + 1 }, (_, i) => firstYear + i);

  const [year, setYear] = useState(currentYear);
  const [filter, setFilter] = useState<StatusFilter>('all');
  /** the row whose check was just clicked, so only it plays the pop */
  const [popped, setPopped] = useState<string | null>(null);

  const { data, isLoading, error } = useDividendCalendar(pid, year);
  const { data: receipts } = useDividendReceipts(pid);
  const saveReceipt = useSaveDividendReceipt(pid);
  const { data: holdings } = useHoldings(pid);
  const { toBase, money } = usePortfolioCurrency(pid, (holdings ?? []).map((h) => h.currency ?? ''));

  const payments = useMemo<CalendarPayment[]>(() => {
    // Fallback for an entry without a currency (an older API): the holding's
    // currency plus the pence heuristic.
    const holdingCurrency = new Map(
      (holdings ?? []).map((h) => [h.ticker.toUpperCase(), h.currency ?? 'USD'] as const),
    );
    const raw = MONTHS.flatMap((label, monthIndex) =>
      (data?.[label.toUpperCase()] ?? []).map((entry, i) => ({ entry, monthIndex, i })));
    const overrides = matchReceipts(
      raw.map(({ entry }) => ({ ticker: entry.ticker, exDate: entry.exDate ?? null })),
      receipts ?? [],
      year,
    );

    return raw.map(({ entry, monthIndex, i }, idx) => {
      const ticker = entry.ticker;
      const fallback = holdingCurrency.get(ticker.toUpperCase()) ?? 'USD';
      const dps = entry.dividendAmount ?? 0;
      // dividendAmount is quoted in MarketData's currency, so a London payer reports
      // pence against a GBP holding — bring it to major units before anything else.
      const perShare = entry.currency
        ? toMajorUnits(dps, entry.currency)
        : looksLikePenceQuote(ticker, fallback) ? dps / 100 : dps;
      const currency = normalizeCurrency(entry.currency ?? fallback);
      const shares = entry.stockQuantity ?? 0;
      const amount = perShare * shares;

      const scheduled = entry.scheduled ?? false;
      const exDate = entry.exDate ? parseLocalDate(entry.exDate) : null;
      const payDate = entry.payDate ? parseLocalDate(entry.payDate) : null;
      const anchor = payDate ?? exDate ?? new Date(year, monthIndex, 1);
      const autoOn = payDate ? addDays(payDate, GRACE_DAYS) : addDays(anchor, NO_PAY_DATE_GRACE_DAYS);
      const natural = naturalState(anchor, autoOn, today, scheduled);
      const override = overrides[idx];

      const withholding = withholdingDefault(entry.country);
      const rateEdited = override?.withholdingRate != null;
      const rate = rateEdited ? Number(override!.withholdingRate) : withholding.rate;

      return {
        key: `${ticker}|${entry.exDate ?? ''}|${monthIndex}-${i}`,
        ticker,
        name: entry.name?.trim() || ticker,
        monthIndex,
        exDate,
        exDateKey: entry.exDate ?? null,
        payDate,
        payDateEstimated: entry.payDateEstimated ?? false,
        anchor,
        autoOn,
        scheduled,
        shares,
        perShare,
        amount,
        baseAmount: toBase(amount, currency),
        currency,
        countryCode: withholding.code,
        defaultRate: withholding.rate,
        rate,
        rateEdited,
        tax: (amount * rate) / 100,
        paymentMonths: entry.paymentMonths ?? [],
        paymentsPerYear: entry.paymentsPerYear ?? null,
        natural,
        state: stateOf(override?.status, natural),
        override,
      };
    });
  }, [data, receipts, holdings, toBase, year, today]);

  const months: MonthGroup[] = MONTHS.map((label, index) => {
    const rows = payments
      .filter((p) => p.monthIndex === index)
      .sort((a, b) => a.anchor.getTime() - b.anchor.getTime() || a.ticker.localeCompare(b.ticker));
    return {
      index,
      label,
      rows,
      visible: filter === 'all' ? rows : rows.filter((p) => p.state === filter),
      total: rows.reduce((sum, p) => sum + p.baseAmount, 0),
      received: rows.reduce((sum, p) => sum + (p.state === 'received' ? p.baseAmount : 0), 0),
      current: year === currentYear && index === currentMonth,
    };
  });
  const shown = months.filter((m) => m.visible.length > 0);
  const counts: Record<StatusFilter, number> = { all: payments.length, upcoming: 0, awaiting: 0, received: 0, missing: 0 };
  payments.forEach((p) => { counts[p.state] += 1; });

  // A phone opens the current year at the current month; any other year, or a
  // new filter, starts from the top. Desktop keeps the page where it is.
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || !window.matchMedia('(max-width: 1023px)').matches) return;
    const signature = `${year}|${filter}`;
    if (scrolledFor.current === signature) return;
    scrolledFor.current = signature;
    const target = year === currentYear ? document.getElementById(`cal-month-${currentMonth}`) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
  }, [year, filter, isLoading, currentYear, currentMonth]);

  /** Overrides are saved under the key they were found by, so a loosely matched one is updated, not duplicated. */
  const keyOf = (p: CalendarPayment) => ({ ticker: p.ticker, exDate: p.override?.exDate ?? p.exDateKey! });

  const toggle = (p: CalendarPayment) => {
    if (!p.exDateKey) return;
    setPopped(p.key);
    saveReceipt.mutate({
      ...keyOf(p),
      status: toggledOverride(p.state, p.natural),
      withholdingRate: p.override?.withholdingRate ?? null,
    });
  };

  const saveRate = (p: CalendarPayment, rate: number | null) => {
    if (!p.exDateKey) return;
    saveReceipt.mutate({ ...keyOf(p), status: p.override?.status ?? null, withholdingRate: rate });
  };

  const caption = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400';
  const isFutureYear = year > currentYear;
  const isCurrentYear = year === currentYear;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Year + status. Sticks under the header on a phone, where the list is long. */}
      <div className="sticky top-16 z-30 -mx-4 mb-3.5 border-b border-slate-200 bg-slate-50 px-4 pb-2.5 pt-3 dark:border-slate-800 dark:bg-slate-950 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mb-2.5 lg:border-0 lg:bg-transparent lg:p-0 lg:dark:bg-transparent">
        <div className="flex flex-col gap-2 lg:h-[34px] lg:flex-row lg:items-center lg:gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn(caption, 'hidden lg:inline')}>Year</span>
            <div className="no-scrollbar inline-flex max-w-full items-center overflow-x-auto rounded-md border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-900/50">
              {yearOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setYear(option)}
                  className={cn(
                    'shrink-0 rounded px-2.5 py-1 text-[12px] font-semibold transition-colors',
                    option === year
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden flex-1 lg:block" />
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn(caption, 'hidden lg:inline')}>Status</span>
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {(['all', ...STATUSES] as StatusFilter[]).map((key) => (
                <Chip
                  key={key}
                  label={STATUS_LABEL[key]}
                  count={counts[key]}
                  active={filter === key}
                  onClick={() => setFilter(key)}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-[5px] text-[11px] text-slate-500 dark:text-slate-400 lg:hidden">
            <Info className="h-3 w-3 shrink-0" />
            <span>Auto-confirms {GRACE_DAYS} days after pay date · uncheck if it didn’t arrive</span>
          </div>
        </div>
      </div>
      <div className="mb-6 hidden items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 lg:flex">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>
          Past payments confirm automatically {GRACE_DAYS} days after the pay date. Uncheck any that didn’t
          arrive; click a withholding rate to change it for that payment.
        </span>
      </div>

      {saveReceipt.isError && (
        <div className="mb-4">
          <ErrorAlert
            title="Couldn’t save that change"
            message={`${(saveReceipt.error as Error)?.message ?? 'Request failed'} — the payment was put back as it was.`}
          />
        </div>
      )}

      {isLoading ? (
        <FullPageSpinner />
      ) : error ? (
        <ErrorAlert title="Error loading dividend calendar" message={(error as Error).message} />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={`No dividends in ${year}`}
          description={
            isFutureYear
              ? 'Nothing to project — no holding has paid a dividend in the last year.'
              : isCurrentYear
                ? 'No payments have been recorded or scheduled for this year yet.'
                : 'No dividend was paid on a position held during this year.'
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={`No ${STATUS_LABEL[filter].toLowerCase()} payments`}
          description={`Nothing in ${year} has this status.`}
        />
      ) : (
        <div className="flex flex-col gap-[18px] lg:gap-7">
          {shown.map((month) => (
            <MonthBlock
              key={month.index}
              month={month}
              year={year}
              today={today}
              popped={popped}
              money={money}
              onToggle={toggle}
              onSaveRate={saveRate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
