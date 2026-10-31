// Installment calendar for the mortgage forms, mirroring MortgageCalculationService: the payment
// day lands on a shorter month's last day (31 → 30 Nov → 28 Feb) and returns to it afterwards.
// Dates are 'YYYY-MM-DD' strings, which compare correctly as strings.
const pad = (n: number) => String(n).padStart(2, '0');
const parts = (date: string) => { const [y, m, d] = date.split('-').map(Number); return { y, m: m - 1, d }; };

/** The installment date in a month; `month` is 0-based and may run past either end of the year. */
export function dueIn(year: number, month: number, day: number): string {
  const y = year + Math.floor(month / 12), m = ((month % 12) + 12) % 12;
  return `${y}-${pad(m + 1)}-${pad(Math.min(day, new Date(y, m + 1, 0).getDate()))}`;
}
export function lastDueOnOrBefore(date: string, day: number): string {
  const { y, m } = parts(date), here = dueIn(y, m, day);
  return here <= date ? here : dueIn(y, m - 1, day);
}
export function firstDueAfter(date: string, day: number): string {
  const { y, m } = parts(date), here = dueIn(y, m, day);
  return here > date ? here : dueIn(y, m + 1, day);
}

/** Installments strictly after `after`, from `first` through `maturity` (the backend's remaining count). */
export function installmentsAfter(after: string, first: string, maturity: string, day: number): number {
  const { y, m } = parts(first);
  let count = 0;
  for (let i = 0; i < 1200; i++) {
    const due = dueIn(y, m + i, day);
    if (due > maturity) break;
    if (due >= first && due > after) count++;
  }
  return count;
}

/** Monthly annuity at rate/12, the backend's convention, in cents. */
export function annuity(principal: number, annualPercent: number, count: number): number | null {
  if (!(principal >= 0) || !(annualPercent >= 0) || count < 1) return null;
  const r = annualPercent / 1200;
  return Math.round((r === 0 ? principal / count : principal * r / (1 - Math.pow(1 + r, -count))) * 100) / 100;
}

/**
 * The dates mortgage setup derives when its optional ones are left blank. The balance is the one
 * the bank app shows today; before the first installment it is the amount paid out, dated on the
 * payout so the debt is known from then.
 */
export function setupDates(loanStart: string, paymentDay: number, today: string, given: { first?: string; balanceDate?: string; rateFrom?: string } = {}) {
  const first = given.first || firstDueAfter(loanStart, paymentDay);
  const paidOnce = lastDueOnOrBefore(today, paymentDay) >= first;
  const balanceDate = given.balanceDate || (paidOnce ? today : loanStart);
  return { first, balanceDate, rateFrom: given.rateFrom || balanceDate, paidOnce };
}
