import { parseLocalDate } from '../../lib/dates';
import type { DividendReceipt, DividendReceiptStatus } from '../../types/dividendCalendar';

/**
 * Receipt status of one payment. Upcoming (pay date ahead) → Awaiting (pay date
 * passed, inside the grace window) → Received (automatically after the window,
 * or confirmed by the user). Unchecking a past payment marks it Missing; an
 * upcoming one can be confirmed early. Only the user's overrides are stored.
 */
export type ReceiptState = 'upcoming' | 'awaiting' | 'received' | 'missing';
export type StatusFilter = ReceiptState | 'all';

export const STATUSES: ReceiptState[] = ['upcoming', 'awaiting', 'received', 'missing'];
export const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'All',
  upcoming: 'Upcoming',
  awaiting: 'Awaiting',
  received: 'Received',
  missing: 'Missing',
};

/** One row of the calendar, every figure in its own quote currency except `baseAmount`. */
export interface CalendarPayment {
  key: string;
  ticker: string;
  name: string;
  /** 0-based month the payment is listed under — its ex-date's month */
  monthIndex: number;
  exDate: Date | null;
  /** the ex-date as the API sent it, which is the override key */
  exDateKey: string | null;
  payDate: Date | null;
  payDateEstimated: boolean;
  /** pay date, or the ex-date when no pay date is reported — what status and order count from */
  anchor: Date;
  /** the day an untouched payment turns Received */
  autoOn: Date;
  scheduled: boolean;
  shares: number;
  /** dividend per share, major units */
  perShare: number;
  amount: number;
  baseAmount: number;
  currency: string;
  countryCode: string | null;
  defaultRate: number;
  rate: number;
  rateEdited: boolean;
  tax: number;
  paymentMonths: number[];
  /** the usual yearly payment count; null on an older API, which then counts the months */
  paymentsPerYear: number | null;
  natural: ReceiptState;
  state: ReceiptState;
  override?: DividendReceipt;
}

/** Days after the pay date a payment confirms itself. */
export const GRACE_DAYS = 3;
/**
 * The same, counted from the ex-date, for a ticker whose pay date Yahoo does not
 * report. Long enough to cover a typical ex → pay lag; it is a rule, never shown
 * as a pay date.
 */
export const NO_PAY_DATE_GRACE_DAYS = 30;
/** How far a projected ex-date may sit from the declared one and still be the same payment (backend DRIFT_DAYS). */
const DRIFT_DAYS = 14;

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Whole days from a to b; rounding absorbs the 23/25-hour DST days. */
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

/**
 * What the dates alone say. A scheduled payment was never declared, so once its
 * date passes it waits for the user instead of confirming itself against a
 * dividend nobody announced.
 */
export function naturalState(anchor: Date, autoOn: Date, today: Date, scheduled: boolean): ReceiptState {
  if (anchor > today) return 'upcoming';
  if (scheduled) return 'awaiting';
  return today < autoOn ? 'awaiting' : 'received';
}

/**
 * The override one click on the check stores. Received toggles back to Upcoming
 * for a payment not due yet and to Missing for one that is; anything else
 * becomes Received. Landing on what the dates say anyway stores nothing.
 */
export function toggledOverride(state: ReceiptState, natural: ReceiptState): DividendReceiptStatus | null {
  const next: ReceiptState = state === 'received'
    ? (natural === 'upcoming' ? 'upcoming' : 'missing')
    : 'received';
  if (next === natural) return null;
  return next === 'received' ? 'RECEIVED' : 'MISSING';
}

export const stateOf = (override: DividendReceiptStatus | null | undefined, natural: ReceiptState): ReceiptState =>
  override === 'RECEIVED' ? 'received' : override === 'MISSING' ? 'missing' : natural;

/**
 * Statutory withholding at source by listing country, as Yahoo names it; US is
 * the W-8BEN treaty rate. A starting point the user corrects per payment — a
 * country not listed defaults to 0% and says so.
 */
const WITHHOLDING: Record<string, { code: string; rate: number }> = {
  'United States': { code: 'US', rate: 15 },
  Netherlands: { code: 'NL', rate: 15 },
  Germany: { code: 'DE', rate: 26.375 },
  'United Kingdom': { code: 'GB', rate: 0 },
  Ireland: { code: 'IE', rate: 25 },
  Switzerland: { code: 'CH', rate: 35 },
  Canada: { code: 'CA', rate: 25 },
  Spain: { code: 'ES', rate: 19 },
  Italy: { code: 'IT', rate: 26 },
  Belgium: { code: 'BE', rate: 30 },
  Denmark: { code: 'DK', rate: 27 },
  Norway: { code: 'NO', rate: 25 },
  Sweden: { code: 'SE', rate: 30 },
  'Hong Kong': { code: 'HK', rate: 0 },
  Taiwan: { code: 'TW', rate: 21 },
};

export function withholdingDefault(country: string | null | undefined): { code: string | null; rate: number } {
  const hit = country ? WITHHOLDING[country] : undefined;
  return hit ?? { code: null, rate: 0 };
}

export const formatRate = (rate: number) => `${+rate.toFixed(3)}%`;

/**
 * The backend's usual cadence (most common yearly count of the last five finished
 * years) when it sent one: a single payment Yahoo never listed would otherwise
 * read a twice-a-year payer (ISNPY, LVMUY) as annual. Without it, the paying
 * months count. Either way the count snaps to the nearest cadence: an ex-date
 * drifting across a month end leaves a monthly payer with 11 distinct months one
 * year and a quarterly one with 3 or 5, and neither changed how often it pays.
 */
export function frequencyLabel(months: number[], perYear?: number | null): string {
  const n = perYear ?? months.length;
  if (n >= 10) return 'Monthly';
  if (n >= 3 && n <= 5) return 'Quarterly';
  if (n === 2) return 'Semi-annual';
  if (n === 1) return 'Annual';
  return n ? `${n}× a year` : 'Unknown';
}

const receiptKey = (ticker: string, exDate: string) => `${ticker}|${exDate}`;

/**
 * Pairs each payment with the override stored for it. Declared payments match
 * by ticker + ex-date. A scheduled payment's ex-date is a projection that moves
 * when the real one is declared, so an override saved against it would be
 * orphaned; overrides of the viewed year that match no payment exactly are
 * therefore handed to the nearest payment of the same ticker within the drift
 * window.
 */
export function matchReceipts(
  payments: { ticker: string; exDate: string | null }[],
  receipts: DividendReceipt[],
  year: number,
): (DividendReceipt | undefined)[] {
  const exact = new Map(receipts.map((r) => [receiptKey(r.ticker, r.exDate), r]));
  const taken = new Set(payments.filter((p) => p.exDate).map((p) => receiptKey(p.ticker, p.exDate!)));
  const loose = new Map<string, DividendReceipt[]>();
  for (const r of receipts) {
    if (taken.has(receiptKey(r.ticker, r.exDate)) || !r.exDate.startsWith(`${year}-`)) continue;
    loose.set(r.ticker, [...(loose.get(r.ticker) ?? []), r]);
  }
  return payments.map((p) => {
    if (!p.exDate) return undefined;
    const hit = exact.get(receiptKey(p.ticker, p.exDate));
    if (hit) return hit;
    const target = parseLocalDate(p.exDate);
    let best: DividendReceipt | undefined;
    let bestGap = DRIFT_DAYS + 1;
    for (const r of loose.get(p.ticker) ?? []) {
      const gap = Math.abs(daysBetween(parseLocalDate(r.exDate), target));
      if (gap < bestGap) {
        best = r;
        bestGap = gap;
      }
    }
    return best;
  });
}
