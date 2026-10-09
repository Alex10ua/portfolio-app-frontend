import { convert, normalizeCurrency } from '../../lib/currency';
import type { FundamentalEntry } from '../../types/fundamentals';
import type { FxRates } from '../../types/fxRate';
import type { Statement, StatementEntry, Statements, YahooFinancials } from '../../types/marketData';

export type ValuationMetric = 'revenue' | 'net' | 'gross' | 'op' | 'fcf';

/** A starting per-share value read off the company's reported figures. */
export interface StartValue {
  /** Per share, in the holding's book currency — what the input holds. */
  value: number;
  /** Per share as reported, in `reportedCurrency`. */
  reported: number;
  reportedCurrency: string;
  source: 'Yahoo Finance' | 'SEC EDGAR';
  /** Trailing twelve months, or the last fiscal year. */
  basis: 'TTM' | 'FY';
  /** Period end, 'YYYY-MM-DD'. */
  periodEnd: string;
}

export interface StartValues {
  values: Partial<Record<ValuationMetric, StartValue>>;
  /** Why Yahoo figures exist but could not be used, e.g. reported in a currency with no FX rate. */
  currencyIssue: string | null;
}

type StatementName = keyof Statements;

/** Total line items divided by diluted shares. Net income is read as reported EPS first (below). */
const LINE_ITEMS: Record<Exclude<ValuationMetric, 'net'>, { statement: StatementName; item: string }> = {
  revenue: { statement: 'income', item: 'TotalRevenue' },
  gross: { statement: 'income', item: 'GrossProfit' },
  op: { statement: 'income', item: 'OperatingIncome' },
  fcf: { statement: 'cashFlow', item: 'FreeCashFlow' },
};

interface Point { value: number; date: string; basis: 'TTM' | 'FY' }

function last(series: StatementEntry[] | undefined): StatementEntry | undefined {
  return series?.length ? series[series.length - 1] : undefined;
}

function itemOf(statements: Statements | null | undefined, statement: StatementName, item: string) {
  const s: Statement | null | undefined = statements?.[statement];
  return s?.[item];
}

/**
 * Latest value of a line item: the trailing twelve months when Yahoo has it, else
 * the last fiscal year. TTM is spotty — MSFT has no TTM DilutedEPS, ULVR.L no TTM
 * GrossProfit — so the fallback is per item, not per statement.
 */
function latest(f: YahooFinancials, statement: StatementName, item: string): Point | undefined {
  const ttm = last(itemOf(f.trailing, statement, item));
  if (ttm) return { value: ttm.value, date: ttm.date, basis: 'TTM' };
  const fy = last(itemOf(f.annual, statement, item));
  if (fy) return { value: fy.value, date: fy.date, basis: 'FY' };
  return undefined;
}

/**
 * Diluted share count for the period a figure covers: TTM figures take the TTM
 * count, fiscal-year figures that year's count, and either falls back to the latest
 * annual count, then to today's shares outstanding.
 */
function dilutedShares(f: YahooFinancials, point: Point, sharesOutstanding: number | null | undefined) {
  const annual = itemOf(f.annual, 'income', 'DilutedAverageShares');
  const same = point.basis === 'TTM'
    ? last(itemOf(f.trailing, 'income', 'DilutedAverageShares'))
    : annual?.find((e) => e.date === point.date);
  const shares = same?.value ?? last(annual)?.value ?? sharesOutstanding ?? undefined;
  return shares && shares > 0 ? shares : undefined;
}

/** A zero or negative figure (a loss, cash burn) is no base for a multiple. */
function usable(n: number | undefined): n is number {
  return n != null && Number.isFinite(n) && n > 0;
}

function hasRate(code: string, rates: FxRates) {
  return code === 'EUR' || (rates[code] ?? 0) > 0;
}

/**
 * Per-share starting values for the valuation model, converted into the holding's
 * book currency (the currency its live price is shown in).
 *
 * Statement figures are in the company's reporting currency, which is not the quote
 * currency: ULVR.L is quoted in GBp and reports in EUR. Without a rate for either side
 * nothing is filled — a wrong number typed in for the user is worse than an empty box.
 *
 * Net income falls back to the SEC 10-K diluted EPS when Yahoo has none; SEC's EPS is
 * taken as USD, which is what US filers report in.
 */
export function deriveStartValues({ financials, secEps, bookCurrency, rates, sharesOutstanding }: {
  financials: YahooFinancials | null | undefined;
  secEps: FundamentalEntry[] | undefined;
  bookCurrency: string;
  rates: FxRates;
  sharesOutstanding?: number | null;
}): StartValues {
  const to = normalizeCurrency(bookCurrency);
  const values: Partial<Record<ValuationMetric, StartValue>> = {};
  let currencyIssue: string | null = null;

  const convertible = (from: string) => from === to || (hasRate(from, rates) && hasRate(to, rates));
  const make = (reported: number, from: string, source: StartValue['source'], point: Point): StartValue => ({
    value: convert(reported, from, to, rates),
    reported,
    reportedCurrency: from,
    source,
    basis: point.basis,
    periodEnd: point.date,
  });

  if (financials && (financials.annual || financials.trailing)) {
    const from = financials.currency ? normalizeCurrency(financials.currency) : null;
    if (!from) {
      currencyIssue = `Yahoo does not say which currency ${financials.ticker} reports in`;
    } else if (!convertible(from)) {
      const missing = hasRate(from, rates) ? to : from;
      currencyIssue = `${financials.ticker} reports in ${from}, and there is no FX rate for ${missing}`;
    } else {
      for (const [metric, { statement, item }] of Object.entries(LINE_ITEMS) as [Exclude<ValuationMetric, 'net'>, { statement: StatementName; item: string }][]) {
        const point = latest(financials, statement, item);
        if (!point) continue;
        const perShare = point.value / (dilutedShares(financials, point, sharesOutstanding) ?? NaN);
        if (usable(perShare)) values[metric] = make(perShare, from, 'Yahoo Finance', point);
      }

      const eps = latest(financials, 'income', 'DilutedEPS');
      if (eps && usable(eps.value)) {
        values.net = make(eps.value, from, 'Yahoo Finance', eps);
      } else {
        const income = latest(financials, 'income', 'NetIncomeCommonStockholders');
        const perShare = income && income.value / (dilutedShares(financials, income, sharesOutstanding) ?? NaN);
        if (income && usable(perShare)) values.net = make(perShare, from, 'Yahoo Finance', income);
      }
    }
  }

  if (!values.net && secEps?.length && convertible('USD')) {
    const fy = [...secEps]
      .filter((e) => e.form?.startsWith('10-K'))
      .sort((a, b) => a.date.localeCompare(b.date))
      .pop();
    if (fy && usable(fy.value)) {
      values.net = make(fy.value, 'USD', 'SEC EDGAR', { value: fy.value, date: fy.date, basis: 'FY' });
    }
  }

  return { values, currencyIssue };
}

// ---------- history (Historicals tab, growth reference) ----------
// All in the reporting currency, as reported: growth rates and margins do not
// depend on the currency, and a table of past years converted at today's rate
// would match none of the company's own reports.

export interface PerSharePoint {
  /** Period end, 'YYYY-MM-DD'. */
  date: string;
  value: number;
}

function perShareSeries(statements: Statements | null | undefined, statement: StatementName, item: string) {
  const totals = itemOf(statements, statement, item) ?? [];
  const shares = itemOf(statements, 'income', 'DilutedAverageShares') ?? [];
  const out: PerSharePoint[] = [];
  for (const e of totals) {
    const n = shares.find((s) => s.date === e.date)?.value;
    if (n && n > 0) out.push({ date: e.date, value: e.value / n });
  }
  return out;
}

/**
 * One metric per share for every fiscal year Yahoo reports (4–5), date-ascending.
 * Each year divides by its own diluted share count, so buybacks show up as growth.
 */
export function annualPerShare(f: YahooFinancials, metric: ValuationMetric): PerSharePoint[] {
  if (metric === 'net') {
    const eps = itemOf(f.annual, 'income', 'DilutedEPS');
    if (eps?.length) return eps.map((e) => ({ date: e.date, value: e.value }));
    return perShareSeries(f.annual, 'income', 'NetIncomeCommonStockholders');
  }
  const { statement, item } = LINE_ITEMS[metric];
  return perShareSeries(f.annual, statement, item);
}

export interface Growth {
  /** Compound annual growth, percent. */
  rate: number;
  from: string;
  to: string;
}

/**
 * Compound annual growth between the first and last fiscal year. Undefined when
 * either end is zero or negative (a loss year has no growth rate) or fewer than
 * two years are reported.
 */
export function historicalGrowth(points: PerSharePoint[]): Growth | undefined {
  if (points.length < 2) return undefined;
  const first = points[0];
  const last = points[points.length - 1];
  const years = (Date.parse(last.date) - Date.parse(first.date)) / (365.25 * 24 * 3600 * 1000);
  if (!(first.value > 0) || !(last.value > 0) || years < 0.5) return undefined;
  return { rate: (Math.pow(last.value / first.value, 1 / years) - 1) * 100, from: first.date, to: last.date };
}

export interface HistoryColumn {
  /** 'FY 2025' or 'TTM'. */
  label: string;
  date: string;
  basis: 'FY' | 'TTM';
}

export interface HistoryRow {
  label: string;
  unit: 'perShare' | 'percent' | 'count';
  values: (number | undefined)[];
}

/** Ratio of two line items at one period, as a percent. */
function margin(statements: Statements | null | undefined, num: [StatementName, string], den: [StatementName, string], date: string) {
  const n = itemOf(statements, num[0], num[1])?.find((e) => e.date === date)?.value;
  const d = itemOf(statements, den[0], den[1])?.find((e) => e.date === date)?.value;
  return n != null && d ? (n / d) * 100 : undefined;
}

/**
 * The Historicals table: the last fiscal years plus TTM when it is newer than the
 * last fiscal year. Per-share rows, the diluted share count, and margins.
 */
export function historyTable(f: YahooFinancials, years = 4): { columns: HistoryColumn[]; rows: HistoryRow[] } {
  const fyDates = [...new Set(Object.values(f.annual?.income ?? {}).flat().map((e) => e.date))].sort().slice(-years);
  const ttmDate = Object.values(f.trailing?.income ?? {}).flat().map((e) => e.date).sort().pop();
  const columns: HistoryColumn[] = fyDates.map((d) => ({ label: `FY ${d.slice(0, 4)}`, date: d, basis: 'FY' }));
  if (ttmDate && (!fyDates.length || ttmDate > fyDates[fyDates.length - 1])) {
    columns.push({ label: 'TTM', date: ttmDate, basis: 'TTM' });
  }

  const statementsOf = (c: HistoryColumn) => (c.basis === 'TTM' ? f.trailing : f.annual);
  // TTM has no share count of its own for some issuers — the last fiscal year's stands in
  const lastFyShares = last(itemOf(f.annual, 'income', 'DilutedAverageShares'))?.value;
  const valueAt = (c: HistoryColumn, statement: StatementName, item: string) =>
    itemOf(statementsOf(c), statement, item)?.find((e) => e.date === c.date)?.value;
  const sharesAt = (c: HistoryColumn) => valueAt(c, 'income', 'DilutedAverageShares') ?? (c.basis === 'TTM' ? lastFyShares : undefined);
  const perShare = (statement: StatementName, item: string, sign = 1) => columns.map((c) => {
    const total = valueAt(c, statement, item);
    const shares = sharesAt(c);
    return total != null && shares ? (sign * total) / shares : undefined;
  });
  const marginRow = (num: [StatementName, string]) =>
    columns.map((c) => margin(statementsOf(c), num, ['income', 'TotalRevenue'], c.date));

  const eps = columns.map((c) => valueAt(c, 'income', 'DilutedEPS'));
  const netPerShare = perShare('income', 'NetIncomeCommonStockholders');

  return {
    columns,
    rows: [
      { label: 'Revenue / share', unit: 'perShare', values: perShare('income', 'TotalRevenue') },
      { label: 'Gross profit / share', unit: 'perShare', values: perShare('income', 'GrossProfit') },
      { label: 'Op. income / share', unit: 'perShare', values: perShare('income', 'OperatingIncome') },
      { label: 'EPS (diluted)', unit: 'perShare', values: eps.map((v, i) => v ?? netPerShare[i]) },
      { label: 'FCF / share', unit: 'perShare', values: perShare('cashFlow', 'FreeCashFlow') },
      // paid out of cash flow, so negative in the statement
      { label: 'Dividends paid / share', unit: 'perShare', values: perShare('cashFlow', 'CashDividendsPaid', -1) },
      { label: 'Diluted shares', unit: 'count', values: columns.map(sharesAt) },
      { label: 'Gross margin', unit: 'percent', values: marginRow(['income', 'GrossProfit']) },
      { label: 'Operating margin', unit: 'percent', values: marginRow(['income', 'OperatingIncome']) },
      { label: 'Net margin', unit: 'percent', values: marginRow(['income', 'NetIncomeCommonStockholders']) },
      { label: 'FCF margin', unit: 'percent', values: marginRow(['cashFlow', 'FreeCashFlow']) },
    ],
  };
}

/** 2 decimals, or 4 under 1 so a penny stock's figure is not rounded to nothing. */
export function roundStart(value: number): number {
  const factor = Math.abs(value) < 1 ? 10_000 : 100;
  return Math.round(value * factor) / factor;
}
