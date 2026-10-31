import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useCloseMortgage, useDeleteMortgage, useExtraPaymentPreview, useMortgagePreview, useSaveMortgageEvent, useUpdateMortgage } from '../../hooks/useMortgages';
import { cn } from '../../lib/cn';
import { parseLocalDate } from '../../lib/dates';
import type { FinancingStatus, PropertyView } from '../../types/realEstate';
import type { ExtraPaymentOutcome, Mortgage, MortgageCheckpoint, MortgagePayment, MortgageRatePeriod, MortgageScheduleRow } from '../../types/mortgage';
import { Card, Editor, Notice, buttonClass, dateLabel, errorText, loanName, money, sourceLabels, today } from './realEstateUi';
import type { FormField, FormValues } from './realEstateUi';
import { lastDueOnOrBefore } from './mortgageDates';

/** payment.extra: prefilled from the "Pay extra?" what-if */
export type MortgageEdit = { kind: 'payment'; target?: MortgagePayment; dueDate?: string; extra?: { date: string; amount: string; lower: boolean } } | { kind: 'balance'; target?: MortgageCheckpoint } | { kind: 'rate'; target?: MortgageRatePeriod } | { kind: 'close' } | { kind: 'details' } | { kind: 'delete' } | { kind: 'extra' };
const blankToNull = (value: string) => value.trim() || null;
const after = (date: string) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const AFTER_EXTRA = [
  { value: 'KEEP', label: 'Keep my installment · pay off sooner', description: 'Same monthly amount. The loan ends earlier and costs less interest.' },
  { value: 'LOWER', label: 'Lower my installment · same end date', description: 'The installment is worked out again over the installments left.' },
];
const monthLabel = (value: string | null) => value ? parseLocalDate(value).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'unknown';
function sooner(from: string | null, to: string | null) {
  if (!from || !to) return null;
  const a = parseLocalDate(from), b = parseLocalDate(to), months = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
  if (months <= 0) return null;
  const years = Math.floor(months / 12), rest = months % 12;
  return [years ? `${years} yr` : '', rest ? `${rest} mo` : ''].filter(Boolean).join(' ');
}
/** The value once it stops changing, so typing an amount asks the backend once rather than per keystroke. */
function useSettled<T>(value: T, ms = 400) {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setSettled(value), ms); return () => clearTimeout(timer); }, [value, ms]);
  return settled;
}

/** Unsaved: the loan as it is against the extra payment ending it sooner or lowering the installment. */
function ExtraPaymentComparison({ portfolioId, propertyId, mortgage, date, amount, choice }: { portfolioId: string; propertyId: string; mortgage: Mortgage; date: string; amount: string; choice: string }) {
  const [askedDate, askedAmount] = JSON.parse(useSettled(JSON.stringify([date, amount]))) as [string, string];
  const query = useExtraPaymentPreview(portfolioId, propertyId, mortgage.id, mortgage.version, askedDate, askedAmount);
  const cur = mortgage.currency, data = query.data, now = data?.current;
  if (!date || !(Number(amount) > 0)) return null;
  const saved = (outcome: ExtraPaymentOutcome) => now ? `Saves ${money(now.remainingInterest - outcome.remainingInterest, cur, 'Symbol', 0)} interest` : null;
  const option = (value: string, title: string, outcome: ExtraPaymentOutcome, lines: (string | null | false)[]) => <div className={cn('rounded-lg border p-3', choice === value ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20' : 'border-slate-200 dark:border-slate-700')}><p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{title}</p><p className="mt-1.5 font-mono text-base font-semibold text-slate-900 dark:text-white">{outcome.installment == null ? 'Paid off' : money(outcome.installment, cur)}{outcome.installment != null && <span className="font-sans text-[11px] font-normal text-slate-500 dark:text-slate-400"> / month</span>}</p>{lines.filter(Boolean).map(line => <p key={String(line)} className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{line}</p>)}</div>;
  const keep = data?.keepInstallment, lower = data?.lowerInstallment, earlier = keep && now ? sooner(keep.payoffDate, now.payoffDate) : null;
  return <Card className="bg-slate-50 p-4 dark:bg-slate-900/40"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-900 dark:text-white">What {money(Number(amount), cur)} extra does</p>{query.isFetching && <LoaderCircle aria-label="Calculating" className="h-3.5 w-3.5 animate-spin text-slate-400" />}</div>
    <div aria-live="polite">{query.error ? <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{(query.error as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'The comparison could not be calculated.'}</p>
      : keep && lower && now ? <><div className="mt-3 grid grid-cols-2 gap-2">
        {option('KEEP', 'Keep installment', keep, [`Ends ${monthLabel(keep.payoffDate)}`, earlier && `${earlier} sooner`, saved(keep)])}
        {option('LOWER', 'Lower installment', lower, [now.installment != null && lower.installment != null && `${money(now.installment - lower.installment, cur)} less a month`, `Ends ${monthLabel(lower.payoffDate)}`, saved(lower)])}
      </div><p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Now: {money(now.installment, cur)} a month until {monthLabel(now.payoffDate)}, {money(now.remainingInterest, cur, 'Symbol', 0)} interest still to pay.{data?.assumedRatePercent != null && ` Assumes ${data.assumedRatePercent}% continues after ${dateLabel(data.assumedAfter)}, when the agreed rate ends; the bank’s next rate will differ.`} Unsaved; never enters net worth.</p></>
      : <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Calculating…</p>}</div>
  </Card>;
}

function RatePreview({ portfolioId, propertyId, mortgage, values }: { portfolioId: string; propertyId: string; mortgage: Mortgage; values: FormValues }) {
  const preview = useMortgagePreview(portfolioId, propertyId, mortgage.id);
  const signature = JSON.stringify(values), reset = preview.reset;
  useEffect(() => reset(), [signature, reset]);
  const sample: MortgageScheduleRow | undefined = preview.data?.schedule.find(row => row.kind === 'INSTALLMENT');
  return <Card className="bg-slate-50 p-4 dark:bg-slate-900/40"><p className="text-xs font-semibold text-slate-900 dark:text-white">Preview over the remaining loan term</p><p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Final maturity stays {dateLabel(mortgage.maturityDate)}. This calculation is unsaved and never enters net worth.</p><button type="button" className={`${buttonClass} mt-3`} disabled={preview.isPending || !values.effectiveFrom || !values.fixedUntil || !values.annualNominalRatePercent} onClick={() => preview.mutate({ effectiveFrom: values.effectiveFrom, fixedUntil: values.fixedUntil, annualNominalRatePercent: values.annualNominalRatePercent, monthlyPayment: blankToNull(values.monthlyPayment) })}>{preview.isPending ? 'Calculating…' : 'Preview installment'}</button>{preview.error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{errorText(preview.error)}</p>}{preview.data && <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700"><p className="font-mono text-lg font-semibold text-slate-900 dark:text-white">{money(preview.data.summary.monthlyPayment ?? sample?.total, mortgage.currency)}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Estimated monthly principal + interest{sample ? ` · first principal ${money(sample.principal, mortgage.currency)} / interest ${money(sample.interest, mortgage.currency)}` : ''}</p>{preview.data.summary.balance.warnings.map(w => <p key={w} className="mt-2 text-xs text-amber-700 dark:text-amber-300">{w}</p>)}</div>}</Card>;
}

export function MortgageEventEditor({ portfolioId, view, mortgage, edit, onClose, onSwitch }: { portfolioId: string; view: PropertyView; mortgage: Mortgage; edit: MortgageEdit; onClose: () => void; onSwitch?: (edit: MortgageEdit) => void }) {
  const save = useSaveMortgageEvent(portfolioId, view.property.id, mortgage.id);
  const close = useCloseMortgage(portfolioId, view.property.id, mortgage.id);
  const update = useUpdateMortgage(portfolioId, view.property.id, mortgage.id);
  const remove = useDeleteMortgage(portfolioId, view.property.id, mortgage.id);
  const cur = mortgage.currency;
  if (edit.kind === 'details') {
    // The backend locks the timeline and debt allocation once tracking starts (they anchor every
    // calculated installment); a wrong date is fixed by deleting the loan and setting it up again.
    const locked = 'Fixed once tracking starts. Entered wrong? Delete this mortgage and set it up again.';
    const fields: FormField[] = [
      { name: 'lender', label: 'Lender (optional)' }, { name: 'name', label: 'Loan name (optional)' },
      { name: 'originalPrincipal', label: `Original borrowed amount (${cur}, optional)`, type: 'number', min: 0 },
      { name: 'balanceTrackingMode', label: 'Between confirmed records', type: 'select', options: [{ value: 'SCHEDULE_ESTIMATE', label: 'Estimate scheduled repayments' }, { value: 'STATEMENT_ONLY', label: 'Confirmed records only' }] },
      { name: 'loanStartDate', label: 'Mortgage start date', type: 'date', disabled: true, section: 'Loan timeline' },
      { name: 'firstPaymentDate', label: 'First contractual installment date', type: 'date', disabled: true, future: true },
      { name: 'maturityDate', label: 'Final maturity date', type: 'date', disabled: true, future: true },
      { name: 'paymentDay', label: 'Monthly payment day', disabled: true },
      { name: 'debtAllocationShare', label: 'Debt allocated to this portfolio (%)', disabled: true, help: locked },
    ];
    return <Editor title="Edit mortgage" subtitle={`${mortgage.lender || 'Mortgage'} · ${view.property.name}`} fields={fields} onClose={onClose} submitLabel="Save mortgage"
      defaults={{ lender: mortgage.lender ?? '', name: mortgage.name ?? '', originalPrincipal: mortgage.originalPrincipal == null ? '' : String(mortgage.originalPrincipal), balanceTrackingMode: mortgage.balanceTrackingMode, loanStartDate: mortgage.loanStartDate, firstPaymentDate: mortgage.firstPaymentDate, maturityDate: mortgage.maturityDate, paymentDay: String(mortgage.paymentDay), debtAllocationShare: String(Number((mortgage.debtAllocationShare * 100).toFixed(4))) }}
      onSubmit={async v => { await update.mutateAsync({ version: mortgage.version, lender: v.lender, name: v.name, originalPrincipal: blankToNull(v.originalPrincipal), balanceTrackingMode: v.balanceTrackingMode as Mortgage['balanceTrackingMode'] }); onClose(); }} />;
  }
  if (edit.kind === 'delete') {
    const active = mortgage.status === 'ACTIVE';
    // With another loan still open the property cannot become mortgage free.
    const othersOpen = view.mortgages.some(m => m.id !== mortgage.id && m.status === 'ACTIVE');
    const afterOptions = othersOpen
      ? [{ value: 'MORTGAGE_SETUP_PENDING', label: 'I will set up a corrected loan' }, { value: 'MORTGAGE_RECORDED', label: 'The remaining loans are all of it' }]
      : [{ value: 'MORTGAGE_SETUP_PENDING', label: 'I will set up a corrected mortgage' }, { value: 'MORTGAGE_FREE', label: 'This property has no mortgage' }];
    const fields: FormField[] = [
      ...(active ? [{ name: 'financingAfter', label: 'After deleting', type: 'select' as const, options: afterOptions, help: 'Until a corrected loan is saved, this property’s equity is unknown and left out of net worth.' }] : []),
      { name: 'confirm', label: 'Type “delete” to confirm', required: true },
    ];
    return <Editor danger title="Delete mortgage" subtitle={`${mortgage.lender || 'Mortgage'} · ${view.property.name}`} fields={fields} defaults={{ financingAfter: 'MORTGAGE_SETUP_PENDING', confirm: '' }} onClose={onClose} submitLabel="Delete permanently"
      validate={v => v.confirm.trim().toLowerCase() !== 'delete' ? { confirm: 'Type delete to confirm.' } : {}}
      onSubmit={async v => { await remove.mutateAsync({ version: mortgage.version, financingAfter: active ? v.financingAfter as FinancingStatus : undefined }); onClose(); }}>
      <Notice title="This cannot be undone" tone="red">Removes the loan with its {mortgage.payments.length} payments, {mortgage.balanceCheckpoints.length} bank balances and {mortgage.ratePeriods.length} rate periods, including from history charts. {active ? 'Repaid the loan? Close it instead to keep its history.' : 'Earlier debt history of this property disappears with it.'}</Notice>
    </Editor>;
  }
  if (edit.kind === 'close') {
    // The backend closes only on a date that holds a confirmed zero balance, so start from the latest one.
    const zeroOn = mortgage.balanceCheckpoints.filter(c => Number(c.principalBalance) === 0).reduce((max, c) => c.asOfDate > max ? c.asOfDate : max, '');
    const fields: FormField[] = [{ name: 'date', label: 'Effective close date', type: 'date', required: true }];
    return <Editor title="Close mortgage" subtitle={`${mortgage.lender || 'Mortgage'} · ${view.property.name}`} fields={fields} defaults={{ date: zeroOn || today() }} onClose={onClose} submitLabel="Close mortgage" onSubmit={async v => { await close.mutateAsync({ date: v.date, version: mortgage.version }); onClose(); }}><Notice title="Confirm the final bank balance first">Add a bank-confirmed zero principal balance on the close date before closing. Earlier debt history stays available. This action does not record a sale or change cash.</Notice></Editor>;
  }
  if (edit.kind === 'extra') {
    const fields: FormField[] = [
      { name: 'date', label: 'Pay on', type: 'date', required: true, future: true },
      { name: 'amount', label: `Extra principal (${cur})`, type: 'number', required: true, min: 0.01, help: 'On top of the regular installments, whole loan.' },
      { name: 'afterExtra', label: 'Then', type: 'radio', options: AFTER_EXTRA },
    ];
    return <Editor confirmDiscard={false} title="Pay extra?" subtitle={`${loanName(mortgage)} · ${view.property.name} · a what-if, nothing is saved`} fields={fields} defaults={{ date: today(), amount: '', afterExtra: 'KEEP' }} onClose={onClose} submitLabel="Record this payment"
      validate={v => v.date > today() ? { date: 'Record it on the day it is paid. Until then this stays a what-if.' } : {}}
      preview={v => <ExtraPaymentComparison portfolioId={portfolioId} propertyId={view.property.id} mortgage={mortgage} date={v.date} amount={v.amount} choice={v.afterExtra} />}
      onSubmit={async v => { if (onSwitch) onSwitch({ kind: 'payment', extra: { date: v.date, amount: v.amount, lower: v.afterExtra === 'LOWER' } }); else onClose(); }} />;
  }
  if (edit.kind === 'payment') {
    const p = edit.target, x = edit.extra;
    const extraPaid = (v: FormValues) => v.paymentState !== 'MISSED' && Number(v.extraPrincipalPaid) > 0;
    const lastDue = lastDueOnOrBefore(today(), mortgage.paymentDay);
    const lastCheckpoint = [...mortgage.balanceCheckpoints].sort((a, b) => b.asOfDate.localeCompare(a.asOfDate))[0]?.asOfDate ?? '';
    const defaultDue = lastDue >= mortgage.firstPaymentDate && lastDue > lastCheckpoint ? lastDue : '';
    const fields: FormField[] = [
      { name: 'paymentDate', label: 'Actual payment date', type: 'date', required: true },
      { name: 'scheduledDueDate', label: 'Replaces installment due on (optional)', type: 'date', future: true, help: 'Match the scheduled due date to replace its estimated repayment. An early payment can reference the next due date. Leave blank for standalone extra principal.' },
      { name: 'paymentState', label: 'Payment status', type: 'select', options: [{ value: 'RECORDED', label: 'Payment recorded' }, { value: 'MISSED', label: 'Installment missed · no principal paid' }] },
      { name: 'principalPaid', label: `Regular principal (${cur})`, type: 'number', required: true, min: 0, section: 'Payment components' },
      { name: 'extraPrincipalPaid', label: `Extra principal (${cur})`, type: 'number', required: true, min: 0, help: 'Exclude this amount from regular principal.' },
      { name: 'interestPaid', label: `Interest (${cur})`, type: 'number', required: true, min: 0 },
      { name: 'feesPaid', label: `Fees (${cur})`, type: 'number', required: true, min: 0 },
      { name: 'afterExtra', label: 'After the extra principal', type: 'radio', options: AFTER_EXTRA, visible: extraPaid },
      { name: 'newInstallment', label: `New installment from the bank (${cur}, optional)`, type: 'number', min: 0.01, visible: v => extraPaid(v) && v.afterExtra === 'LOWER', help: 'Leave blank to work it out over the installments left. Enter the bank’s figure once it confirms one.' },
      { name: 'note', label: 'Note (optional)', type: 'textarea' },
    ];
    return <Editor title={p ? 'Correct payment' : 'Record payment'} subtitle={`${view.property.name} · whole-loan amounts in ${cur}`} fields={fields} defaults={{ paymentDate: p?.paymentDate ?? x?.date ?? (edit.dueDate && edit.dueDate <= today() ? edit.dueDate : today()), scheduledDueDate: p?.scheduledDueDate ?? edit.dueDate ?? (x ? '' : defaultDue), paymentState: p && Number(p.principalPaid) + Number(p.extraPrincipalPaid) + Number(p.interestPaid) + Number(p.feesPaid) === 0 ? 'MISSED' : 'RECORDED', principalPaid: String(p?.principalPaid ?? 0), extraPrincipalPaid: String(p?.extraPrincipalPaid ?? x?.amount ?? 0), interestPaid: String(p?.interestPaid ?? 0), feesPaid: String(p?.feesPaid ?? 0), afterExtra: p?.lowerInstallment || x?.lower ? 'LOWER' : 'KEEP', newInstallment: p?.newInstallment == null ? '' : String(p.newInstallment), note: p?.note ?? '' }} onClose={onClose} submitLabel={p ? 'Save correction' : 'Record payment'}
      validate={v => !v.scheduledDueDate && (v.paymentState === 'MISSED' || Number(v.principalPaid) > 0 || Number(v.interestPaid) > 0) ? { scheduledDueDate: 'Choose the due installment so this payment replaces its estimate. Standalone extra principal can leave this blank.' } : {}}
      preview={v => <><Card className="bg-slate-50 p-4 dark:bg-slate-900/40"><p className="text-xs font-semibold text-slate-900 dark:text-white">{v.paymentState === 'MISSED' ? 'No payment will be recorded for this installment' : `Total paid: ${money(['principalPaid', 'extraPrincipalPaid', 'interestPaid', 'feesPaid'].reduce((s, k) => s + (Number(v[k]) || 0), 0), cur)}`}</p><p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{v.paymentState === 'MISSED' ? 'All four amounts will be saved as zero. The matching scheduled repayment is suppressed.' : `Principal reduction: ${money((Number(v.principalPaid) || 0) + (Number(v.extraPrincipalPaid) || 0), cur)}. Interest and fees are costs and do not increase equity.`} {p ? 'Later estimates will be recalculated after this correction.' : 'Manual cash is updated separately.'}</p></Card>{!p && extraPaid(v) && <ExtraPaymentComparison portfolioId={portfolioId} propertyId={view.property.id} mortgage={mortgage} date={v.paymentDate} amount={v.extraPrincipalPaid} choice={v.afterExtra} />}</>}
      onSubmit={async v => { const missed = v.paymentState === 'MISSED', lower = extraPaid(v) && v.afterExtra === 'LOWER'; await save.mutateAsync({ kind: 'payments', id: p?.id ?? null, payload: { version: mortgage.version, paymentDate: v.paymentDate, scheduledDueDate: blankToNull(v.scheduledDueDate), principalPaid: missed ? '0' : v.principalPaid, extraPrincipalPaid: missed ? '0' : v.extraPrincipalPaid, interestPaid: missed ? '0' : v.interestPaid, feesPaid: missed ? '0' : v.feesPaid, note: v.note || (missed ? 'Missed installment' : ''), lowerInstallment: lower || null, newInstallment: lower ? blankToNull(v.newInstallment) : null } }); onClose(); }} />;
  }
  if (edit.kind === 'balance') {
    const cp = edit.target;
    const baseline = cp?.principalBalance ?? view.loanSummaries[mortgage.id]?.balance.principalBalance;
    const fields: FormField[] = [{ name: 'asOfDate', label: 'Balance as of (end of day)', type: 'date', required: true, help: 'Includes that day’s payments, so they will not be subtracted again.' }, { name: 'principalBalance', label: `Bank principal balance (${cur})`, type: 'number', required: true, min: 0 }, { name: 'source', label: 'Source', type: 'select', options: ['BANK_STATEMENT', 'USER_CONFIRMED'].map(value => ({ value, label: sourceLabels[value] })) }, { name: 'note', label: 'Note (optional)', type: 'textarea' }];
    return <Editor title={cp ? 'Correct bank balance' : 'Update bank balance'} subtitle={`${view.property.name} · remaining principal, not a payoff quote`} fields={fields} defaults={{ asOfDate: cp?.asOfDate ?? today(), principalBalance: cp ? String(cp.principalBalance) : '', source: cp?.source ?? 'BANK_STATEMENT', note: cp?.note ?? '' }} onClose={onClose} submitLabel="Save bank balance"
      preview={v => <Card className="bg-slate-50 p-4 dark:bg-slate-900/40"><p className="text-xs font-semibold text-slate-900 dark:text-white">Reconciliation</p><p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{cp ? 'Stored bank balance' : 'Current tracked principal'}: {money(baseline, cur)}</p>{v.principalBalance && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">New confirmed principal: {money(Number(v.principalBalance), cur)}</p>}<p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">The confirmed amount replaces the estimate from {dateLabel(v.asOfDate)}. A difference is a reconciliation, not a payment or income. The installment remains unchanged.</p></Card>}
      onSubmit={async v => { await save.mutateAsync({ kind: 'balance-checkpoints', id: cp?.id ?? null, payload: { version: mortgage.version, asOfDate: v.asOfDate, principalBalance: v.principalBalance, source: v.source as 'BANK_STATEMENT' | 'USER_CONFIRMED', note: v.note } }); onClose(); }} />;
  }
  const period = edit.target;
  const latest = [...mortgage.ratePeriods].sort((a, b) => b.fixedUntil.localeCompare(a.fixedUntil))[0];
  const fields: FormField[] = [
    { name: 'effectiveFrom', label: 'New rate effective from', type: 'date', required: true, future: true, help: 'Both dates are inclusive. Start on a scheduled payment day for a complete monthly cycle.' },
    { name: 'fixedUntil', label: 'Fixed through (inclusive)', type: 'date', required: true, future: true },
    { name: 'annualNominalRatePercent', label: 'Nominal interest rate (% p.a.)', type: 'number', required: true, min: 0, max: 100 },
    { name: 'monthlyPayment', label: `Bank-agreed installment (${cur}, optional)`, type: 'number', min: 0.01, help: 'Leave blank to calculate and retain an estimated installment over the remaining term.' },
  ];
  return <Editor title={period ? 'Correct rate period' : 'Record new rate'} subtitle={`${view.property.name} · preserve the existing repayment horizon`} fields={fields} defaults={{ effectiveFrom: period?.effectiveFrom ?? (latest ? after(latest.fixedUntil) : today()), fixedUntil: period?.fixedUntil ?? '', annualNominalRatePercent: period ? String(period.annualNominalRatePercent) : '', monthlyPayment: period?.monthlyPayment && period.paymentSource === 'BANK_AGREED' ? String(period.monthlyPayment) : '' }} onClose={onClose} submitLabel={period ? 'Save correction' : 'Save agreed rate'} validate={v => v.fixedUntil < v.effectiveFrom ? { fixedUntil: 'The fixed-through date must follow the effective date.' } : {}}
    preview={values => <RatePreview portfolioId={portfolioId} propertyId={view.property.id} mortgage={mortgage} values={values} />}
    onSubmit={async v => { await save.mutateAsync({ kind: 'rate-periods', id: period?.id ?? null, payload: { version: mortgage.version, effectiveFrom: v.effectiveFrom, fixedUntil: v.fixedUntil, annualNominalRatePercent: v.annualNominalRatePercent, monthlyPayment: blankToNull(v.monthlyPayment), paymentSource: v.monthlyPayment ? 'BANK_AGREED' : 'CALCULATED' } }); onClose(); }}>
    <Notice title={period ? 'Correct a stored period' : 'Only save a rate the bank has agreed'}>{period ? 'This replaces the incorrect period and recalculates later estimates. Other rate periods remain in history.' : 'The next rate is unknown until confirmed. Use Preview for an unsaved scenario; do not save a guessed bank rate.'}</Notice>
  </Editor>;
}

