import { useState } from 'react';
import { CURRENCIES } from '../../lib/currency';
import { useArchiveProperty, useDeleteProperty, useSaveProperty, useSaveValuation } from '../../hooks/useRealEstate';
import { useCreateMortgage } from '../../hooks/useMortgages';
import type { PropertyPayload, PropertyType, PropertyUsage, PropertyValuation, PropertyView, RealEstateProperty, ValuationSource } from '../../types/realEstate';
import type { BalanceTrackingMode } from '../../types/mortgage';
import { Card, Editor, Notice, dateLabel, loanName, money, propertyLabels, share, sourceLabels, today } from './realEstateUi';
import { annuity, installmentsAfter, lastDueOnOrBefore, setupDates } from './mortgageDates';
import type { FormField, FormValues } from './realEstateUi';

const propertyTypeOptions = ['APARTMENT', 'HOUSE', 'LAND', 'COMMERCIAL', 'OTHER'].map(value => ({ value, label: propertyLabels[value] }));
const usageOptions = ['HOME', 'RENTAL', 'OTHER'].map(value => ({ value, label: propertyLabels[value] }));
const valuationOptions = ['OWNER_ESTIMATE', 'APPRAISAL', 'PURCHASE'].map(value => ({ value, label: sourceLabels[value] }));
const balanceOptions = ['BANK_STATEMENT', 'USER_CONFIRMED'].map(value => ({ value, label: sourceLabels[value] }));
const nullable = (value: string) => value.trim() || null;

/** The stored property as an update that changes nothing but confirms every loan is recorded. */
export function recordedPayload(p: RealEstateProperty): PropertyPayload {
  return { name: p.name, propertyType: p.propertyType, usage: p.usage, location: p.location ?? '', country: p.country ?? '', currency: p.currency, ownershipShare: p.ownershipShare, trackingStartDate: p.trackingStartDate, financingStatus: 'MORTGAGE_RECORDED', purchaseDate: p.purchaseDate ?? null, purchasePrice: p.purchasePrice ?? null, acquisitionCosts: p.acquisitionCosts ?? null, notes: p.notes ?? '', version: p.version };
}

export function PropertyEditor({ portfolioId, view, setup = false, onClose, onSaved }: { portfolioId: string; view?: PropertyView; setup?: boolean; onClose: () => void; onSaved?: (view: PropertyView) => void }) {
  const [saved, setSaved] = useState<PropertyView | null>(setup && view ? view : null);
  const save = useSaveProperty(portfolioId);
  if (saved) return <MortgageSetupEditor portfolioId={portfolioId} view={saved} onClose={onClose} onSaved={() => { onSaved?.(saved); onClose(); }} />;
  const p = view?.property;
  // With a loan open the question is whether every loan is recorded; mortgage free needs them closed first.
  const openLoans = view?.mortgages.some(m => m.status === 'ACTIVE') ?? false;
  const financingOptions = openLoans ? [{ value: 'MORTGAGE_RECORDED', label: 'Every loan is recorded' }, { value: 'MORTGAGE_SETUP_PENDING', label: 'Another loan is still to be set up' }]
    : p?.financingStatus === 'MORTGAGE_RECORDED' ? [{ value: 'MORTGAGE_RECORDED', label: 'Mortgage recorded' }]
    : [{ value: 'MORTGAGE_FREE', label: 'Mortgage free' }, { value: 'MORTGAGE_SETUP_PENDING', label: 'Has a mortgage · set up next' }];
  const fields: FormField[] = [
    { name: 'name', label: 'Property name', required: true },
    { name: 'propertyType', label: 'Property type', type: 'select', options: propertyTypeOptions },
    { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES.map(c => ({ value: c.code, label: `${c.code} · ${c.name}` })), disabled: Boolean(p), section: 'Value and ownership' },
    ...(!p ? [{ name: 'fullPropertyValue', label: 'Estimated full property value', type: 'number' as const, required: true, min: 0, help: 'The whole property, even if you own part of it.' }] : []),
    // The opening valuation is dated on the tracking start (the backend's default), so one date covers both.
    { name: 'trackingStartDate', label: p ? 'Tracking started on' : 'Value as of', type: 'date', required: true, disabled: Boolean(p), help: p ? undefined : 'Tracking starts on this date. You do not need older mortgage payments.' },
    { name: 'ownershipShare', label: 'Recorded ownership (%)', type: 'number', required: true, min: 0.01, max: 100, disabled: Boolean(p?.valuations.length), help: 'Your recorded share of the property. Your share of the mortgage is asked separately.' },
    { name: 'financingStatus', label: 'Mortgage', type: 'select', options: financingOptions, help: 'If a mortgage is declared, equity remains unknown until its bank balance is saved in the next step.' },
    { name: 'usage', label: 'Use', type: 'select', options: usageOptions, advanced: true },
    { name: 'location', label: 'Location (optional)', help: 'A city or a private label is enough. A street address is not required.', advanced: true },
    { name: 'country', label: 'Country (optional)', advanced: true },
    ...(!p ? [{ name: 'valuationSource', label: 'Valuation source', type: 'select' as const, options: valuationOptions, advanced: true }] : []),
    { name: 'purchaseDate', label: 'Purchase date (optional)', type: 'date', section: 'Original purchase · optional', advanced: true },
    { name: 'purchasePrice', label: 'Purchase price (optional)', type: 'number', min: 0, advanced: true },
    { name: 'acquisitionCosts', label: 'Acquisition costs (optional)', type: 'number', min: 0, advanced: true },
    { name: 'notes', label: 'Notes', type: 'textarea', advanced: true },
  ];
  return <Editor title={p ? 'Edit property' : 'Add property'} subtitle={p ? 'Update the property details. Add valuations separately to preserve their dates.' : 'Step 1 of 2 if mortgaged · start with a current value and your ownership share.'} fields={fields}
    defaults={{ name: p?.name ?? '', propertyType: p?.propertyType ?? 'APARTMENT', usage: p?.usage ?? 'HOME', location: p?.location ?? '', country: p?.country ?? '', currency: p?.currency ?? 'EUR', ownershipShare: String((p?.ownershipShare ?? 1) * 100), trackingStartDate: p?.trackingStartDate ?? today(), fullPropertyValue: '', valuationSource: 'OWNER_ESTIMATE', financingStatus: p?.financingStatus ?? 'MORTGAGE_FREE', purchaseDate: p?.purchaseDate ?? '', purchasePrice: p?.purchasePrice == null ? '' : String(p.purchasePrice), acquisitionCosts: p?.acquisitionCosts == null ? '' : String(p.acquisitionCosts), notes: p?.notes ?? '' }}
    onClose={onClose} submitLabel={p ? 'Save property' : 'Save property & continue'}
    preview={v => !p && v.fullPropertyValue ? <Card className="bg-slate-50 p-4 dark:bg-slate-900/40"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Your share of value</p><p className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-white">{money(Number(v.fullPropertyValue) * Number(v.ownershipShare) / 100, v.currency)}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{v.financingStatus === 'MORTGAGE_SETUP_PENDING' ? 'Equity will be unknown until mortgage setup is complete.' : 'Mortgage free: this is the property’s contribution to net worth.'}</p></Card> : null}
    onSubmit={async v => {
      const payload: PropertyPayload = { name: v.name.trim(), propertyType: v.propertyType as PropertyType, usage: v.usage as PropertyUsage, location: v.location, country: v.country, currency: v.currency, ownershipShare: Number(v.ownershipShare) / 100, trackingStartDate: v.trackingStartDate, financingStatus: v.financingStatus as PropertyPayload['financingStatus'], purchaseDate: nullable(v.purchaseDate), purchasePrice: nullable(v.purchasePrice), acquisitionCosts: nullable(v.acquisitionCosts), notes: v.notes, version: p?.version, ...(!p ? { fullPropertyValue: v.fullPropertyValue, valuationSource: v.valuationSource as ValuationSource } : {}) };
      const result = await save.mutateAsync({ id: p?.id ?? null, payload });
      if (result.property.financingStatus === 'MORTGAGE_SETUP_PENDING') setSaved(result); else { onSaved?.(result); onClose(); }
    }} />;
}

export function MortgageSetupEditor({ portfolioId, view, onClose, onSaved }: { portfolioId: string; view: PropertyView; onClose: () => void; onSaved?: () => void }) {
  const p = view.property, mutation = useCreateMortgage(portfolioId, p.id), cur = p.currency, now = today();
  // Below 100% ownership the loan share is a real question: it is asked, never assumed to match.
  const coOwned = p.ownershipShare < 1;
  // Adding a loan beside open ones (a down-payment loan next to the mortgage): equity counts them all.
  const others = view.mortgages.filter(m => m.status === 'ACTIVE'), adding = others.length > 0;
  const otherDebt = others.reduce((sum, m) => sum + (view.loanSummaries[m.id]?.balance.principalBalance ?? 0) * m.debtAllocationShare, 0);
  // Optional dates left blank are derived (setupDates): the balance is today's, or the payout before
  // the first installment; the rate applies from it and the first installment follows the payout.
  const dates = (v: FormValues) => {
    const day = Number(v.paymentDay);
    return v.loanStartDate && Number.isInteger(day) && day >= 1 && day <= 31
      ? { day, ...setupDates(v.loanStartDate, day, now, { first: v.firstPaymentDate, balanceDate: v.asOfDate, rateFrom: v.effectiveFrom }) } : null;
  };
  const estimate = (v: FormValues) => {
    const d = dates(v);
    if (!d || !v.maturityDate || !v.principalBalance || !v.annualNominalRatePercent) return null;
    const count = installmentsAfter(d.balanceDate, d.first, v.maturityDate, d.day);
    return { count, payment: annuity(Number(v.principalBalance), Number(v.annualNominalRatePercent), count) };
  };
  const fields: FormField[] = [
    ...(adding ? [{ name: 'name', label: 'Loan name', section: 'This loan', help: 'Tells the loans apart, e.g. “Down-payment loan”.' }] : []),
    { name: 'principalBalance', label: `Outstanding principal (${cur})`, type: 'number', required: true, min: 0, section: 'From your bank app', help: v => { const d = dates(v); return !d ? 'The whole loan, not only your share.' : v.asOfDate ? `The whole loan as of ${dateLabel(d.balanceDate)}.` : d.paidOnce ? 'The whole loan, as your bank app shows it today.' : `No installment paid yet: the whole amount paid out on ${dateLabel(d.balanceDate)}.`; } },
    { name: 'annualNominalRatePercent', label: 'Nominal rate (% p.a.)', type: 'number', required: true, min: 0, max: 100, help: 'The contract rate, not RPMN / APR.' },
    { name: 'monthlyPayment', label: `Monthly installment (${cur}, optional)`, type: 'number', min: 0.01, help: v => { const e = estimate(v); return e?.payment != null ? `Principal + interest. Blank = calculated ${money(e.payment, cur)} over ${e.count} installments.` : 'Principal + interest. Leave blank to calculate it.'; } },
    { name: 'fixedUntil', label: 'Rate fixed through', type: 'date', required: true, future: true, help: 'Inclusive end of the current fixation. The app asks for the new rate after it. Fixed for the whole loan? Use its final maturity.' },
    { name: 'paymentDay', label: 'Payment day', type: 'number', required: true, min: 1, max: 31, help: 'Day of the month the installment is paid. 31 = the last day of shorter months.' },
    { name: 'loanStartDate', label: 'Loan start', type: 'date', required: true, section: 'From your contract', help: 'When the bank paid out the loan.' },
    { name: 'maturityDate', label: 'Final maturity', type: 'date', required: true, future: true, help: 'The last installment: the end of the loan, not of the rate fixation.' },
    { name: 'debtAllocationShare', label: coOwned ? 'Your share of this loan (%)' : 'Debt allocated to this portfolio (%)', type: 'number', required: true, min: 0, max: 100, advanced: !coOwned, section: coOwned ? 'Your share' : undefined, help: coOwned ? `You own ${share(p.ownershipShare)}. Enter the part of the loan counted in this portfolio; it does not have to match.` : 'Part of the loan counted in this portfolio: a tracking choice, independent of ownership.' },
    { name: 'lender', label: 'Lender (optional)', advanced: true }, ...(!adding ? [{ name: 'name', label: 'Loan name (optional)', advanced: true }] : []),
    { name: 'originalPrincipal', label: `Original borrowed amount (${cur}, optional)`, type: 'number', min: 0, advanced: true },
    { name: 'firstPaymentDate', label: 'First installment date (optional)', type: 'date', future: true, advanced: true, help: v => { const d = dates({ ...v, firstPaymentDate: '' }); return `Blank = ${d ? dateLabel(d.first) : 'the first payment day after the loan start'}.`; } },
    { name: 'asOfDate', label: 'Balance date (optional)', type: 'date', advanced: true, help: v => { const d = dates({ ...v, asOfDate: '' }); return `Blank = ${d ? dateLabel(d.balanceDate) : 'today'}.`; } },
    { name: 'effectiveFrom', label: 'Current rate applies from (optional)', type: 'date', advanced: true, help: 'Blank = the balance date. The rate must already apply on it.' },
    { name: 'source', label: 'Balance source', type: 'select', options: balanceOptions, advanced: true },
    { name: 'balanceTrackingMode', label: 'Between bank balances', type: 'select', options: [{ value: 'SCHEDULE_ESTIMATE', label: 'Estimate scheduled repayments' }, { value: 'STATEMENT_ONLY', label: 'Confirmed records only' }], advanced: true },
  ];
  return <Editor title={adding ? 'Add loan' : 'Set up mortgage'} subtitle={adding ? `${p.name} · beside ${others.map(loanName).join(', ')} · amounts in ${cur}` : `${p.name} · Step 2 · amounts in ${cur}`} fields={fields} onClose={onClose} submitLabel={adding ? 'Save loan' : 'Save mortgage'}
    defaults={{ principalBalance: '', annualNominalRatePercent: '', monthlyPayment: '', fixedUntil: '', paymentDay: '', loanStartDate: p.purchaseDate ?? '', maturityDate: '', debtAllocationShare: coOwned ? '' : '100', lender: '', name: '', originalPrincipal: '', firstPaymentDate: '', asOfDate: '', effectiveFrom: '', source: 'BANK_STATEMENT', balanceTrackingMode: 'SCHEDULE_ESTIMATE' }}
    validate={v => {
      const e: Record<string, string> = {}, d = dates(v);
      if (!d) return { paymentDay: 'Enter a whole day of the month (1–31).' };
      if (v.firstPaymentDate && v.firstPaymentDate < v.loanStartDate) e.firstPaymentDate = 'The first installment cannot precede the loan start.';
      else if (v.firstPaymentDate && lastDueOnOrBefore(v.firstPaymentDate, d.day) !== v.firstPaymentDate) e.firstPaymentDate = `Must fall on payment day ${d.day}.`;
      if (v.maturityDate <= v.loanStartDate || v.maturityDate < d.first) e.maturityDate = 'Final maturity must follow the loan start and the first installment.';
      else if (v.maturityDate > `${Number(v.loanStartDate.slice(0, 4)) + 60}${v.loanStartDate.slice(4)}`) e.maturityDate = 'At most 60 years after the loan start.';
      else if (v.maturityDate <= d.balanceDate) e.maturityDate = `Must follow the balance date (${dateLabel(d.balanceDate)}).`;
      if (d.balanceDate < v.loanStartDate) e.asOfDate = 'The balance cannot precede the loan start.';
      if (d.rateFrom < v.loanStartDate) e.effectiveFrom = 'The rate cannot start before the loan.';
      else if (d.rateFrom > d.balanceDate) e.effectiveFrom = `The rate must already apply on ${dateLabel(d.balanceDate)}.`;
      if (v.fixedUntil < d.balanceDate) e.fixedUntil = `This fixation ended before ${dateLabel(d.balanceDate)}. Enter the rate that applies now and when it ends.`;
      else if (v.fixedUntil > v.maturityDate) e.fixedUntil = 'The fixation cannot run past final maturity.';
      const interest = Number(v.principalBalance) * Number(v.annualNominalRatePercent) / 1200;
      if (v.monthlyPayment && Number(v.monthlyPayment) <= interest) e.monthlyPayment = `Does not cover a month’s interest (${money(interest, cur)}). Interest-only loans are not supported.`;
      return e;
    }}
    preview={v => {
      const e = estimate(v);
      const debt = v.principalBalance && v.debtAllocationShare ? Number(v.principalBalance) * Number(v.debtAllocationShare) / 100 : null;
      return <Card className="bg-slate-50 p-4 dark:bg-slate-900/40">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">Equity after setup</p>
        <p className="mt-2 font-mono text-xl font-semibold text-teal-700 dark:text-teal-300">{debt == null ? '—' : money((view.ownedValue ?? 0) - otherDebt - debt, cur)}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{share(p.ownershipShare)} ownership · {v.debtAllocationShare || '—'}% of this loan tracked here.{adding ? ` Includes ${money(otherDebt, cur)} attributed to the other ${others.length === 1 ? 'loan' : 'loans'}.` : ''}{e?.payment != null ? ` Installment ${v.monthlyPayment ? `${money(Number(v.monthlyPayment), cur)} (bank agreed)` : `${money(e.payment, cur)} (calculated)`}, ${e.count} left.` : ''} Estimates never confirm a payment as paid.</p>
      </Card>;
    }}
    onSubmit={async v => {
      const d = dates(v)!;
      await mutation.mutateAsync({ propertyVersion: p.version, currency: cur, lender: v.lender, name: v.name, originalPrincipal: nullable(v.originalPrincipal), loanStartDate: v.loanStartDate, firstPaymentDate: d.first, maturityDate: v.maturityDate, paymentDay: d.day, debtAllocationShare: Number(v.debtAllocationShare) / 100, balanceTrackingMode: v.balanceTrackingMode as BalanceTrackingMode, openingBalance: { asOfDate: d.balanceDate, principalBalance: v.principalBalance, source: v.source as 'BANK_STATEMENT' | 'USER_CONFIRMED' }, ratePeriod: { effectiveFrom: d.rateFrom, fixedUntil: v.fixedUntil, annualNominalRatePercent: v.annualNominalRatePercent, monthlyPayment: nullable(v.monthlyPayment), paymentSource: v.monthlyPayment ? 'BANK_AGREED' : 'CALCULATED' } });
      onSaved?.(); if (!onSaved) onClose();
    }}>
    {!adding && <Notice title="The property is already saved">If you leave now, finish mortgage setup from this property later. Until then, its debt and equity remain incomplete.</Notice>}
  </Editor>;
}

export function ValuationEditor({ portfolioId, view, valuation, onClose }: { portfolioId: string; view: PropertyView; valuation?: PropertyValuation; onClose: () => void }) {
  const p = view.property, mutation = useSaveValuation(portfolioId, p.id);
  const fields: FormField[] = [{ name: 'effectiveDate', label: 'Effective date', type: 'date', required: true }, { name: 'fullPropertyValue', label: `Full property value (${p.currency})`, type: 'number', required: true, min: 0 }, { name: 'source', label: 'Source', type: 'select', options: valuationOptions }, { name: 'note', label: 'Note (optional)', type: 'textarea' }];
  return <Editor title={valuation ? 'Correct valuation' : 'Add valuation'} subtitle={`${p.name} · ${p.currency}`} fields={fields} defaults={{ effectiveDate: valuation?.effectiveDate ?? today(), fullPropertyValue: valuation ? String(valuation.fullPropertyValue) : '', source: valuation?.source ?? 'OWNER_ESTIMATE', note: valuation?.note ?? '' }} onClose={onClose} submitLabel={valuation ? 'Save correction' : 'Add valuation'} validate={v => v.effectiveDate < p.trackingStartDate ? { effectiveDate: `History starts ${dateLabel(p.trackingStartDate)}.` } : {}}
    preview={v => <Card className="bg-slate-50 p-4 dark:bg-slate-900/40"><div className="text-xs font-semibold text-slate-900 dark:text-white">Your {share(p.ownershipShare)} share: {v.fullPropertyValue ? money(Number(v.fullPropertyValue) * p.ownershipShare, p.currency) : '—'}</div><p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">This valuation applies from {dateLabel(v.effectiveDate)} until the next recorded valuation. Historical equity for that interval will be recalculated; principal repaid is unchanged.</p>{v.fullPropertyValue && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Change from {valuation ? 'the corrected value' : 'the latest estimate'}: {money((Number(v.fullPropertyValue) - (valuation?.fullPropertyValue ?? view.fullValue ?? 0)) * p.ownershipShare, p.currency)}</p>}</Card>}
    onSubmit={async v => { await mutation.mutateAsync({ id: valuation?.id ?? null, payload: { version: p.version, effectiveDate: v.effectiveDate, fullPropertyValue: v.fullPropertyValue, source: v.source as ValuationSource, note: v.note } }); onClose(); }} />;
}

export function DeletePropertyEditor({ portfolioId, view, onClose, onDeleted }: { portfolioId: string; view: PropertyView; onClose: () => void; onDeleted: () => void }) {
  const p = view.property, mutation = useDeleteProperty(portfolioId);
  const loans = view.mortgages.length;
  const records = view.mortgages.reduce((n, m) => n + m.payments.length + m.balanceCheckpoints.length + m.ratePeriods.length, 0);
  const fields: FormField[] = [{ name: 'confirm', label: `Type “${p.name}” to confirm`, required: true }];
  return <Editor danger title="Delete property" subtitle={p.name} fields={fields} defaults={{ confirm: '' }} onClose={onClose} submitLabel="Delete permanently"
    validate={v => v.confirm.trim() !== p.name.trim() ? { confirm: 'The name does not match.' } : {}}
    onSubmit={async () => { await mutation.mutateAsync({ id: p.id, version: p.version }); onDeleted(); }}>
    <Notice title="This cannot be undone" tone="red">Removes the property, its {p.valuations.length} {p.valuations.length === 1 ? 'valuation' : 'valuations'}{loans ? ` and ${loans} ${loans === 1 ? 'mortgage' : 'mortgages'} with ${records} recorded payments, balances and rates` : ''}. Its equity leaves net worth and every history chart. Sold it? Archive instead to keep its history.</Notice>
  </Editor>;
}

export function ArchiveEditor({ portfolioId, view, onClose }: { portfolioId: string; view: PropertyView; onClose: () => void }) {
  const mutation = useArchiveProperty(portfolioId);
  const fields: FormField[] = [{ name: 'date', label: 'Archive effective date', type: 'date', required: true }];
  return <Editor title="Archive property" subtitle={view.property.name} fields={fields} defaults={{ date: today() }} onClose={onClose} submitLabel="Archive property" onSubmit={async (v: FormValues) => { await mutation.mutateAsync({ id: view.property.id, date: v.date, version: view.property.version }); onClose(); }}><Notice title="History will be preserved">From this date, the property leaves current totals. Any mortgage must first be closed with a confirmed zero principal balance. Archiving does not record sale proceeds or modify cash.</Notice></Editor>;
}
