import { useId, useMemo, useState, type ReactNode } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AlertCircle, ArrowRight, Building2, ChevronDown, Home, LoaderCircle, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '../../lib/cn';
import { formatMoney } from '../../lib/currency';
import { parseLocalDate } from '../../lib/dates';
import type { CurrencyDisplay } from '../../types/settings';
import type { PropertyView } from '../../types/realEstate';

export const propertyLabels: Record<string, string> = { APARTMENT: 'Apartment', HOUSE: 'House', LAND: 'Land', COMMERCIAL: 'Commercial', OTHER: 'Other', HOME: 'Home', RENTAL: 'Rental' };
export const sourceLabels: Record<string, string> = { OWNER_ESTIMATE: 'Owner estimate', APPRAISAL: 'Appraisal', PURCHASE: 'Purchase', BANK_STATEMENT: 'Bank statement', USER_CONFIRMED: 'Confirmed by you', BANK_AGREED: 'Bank agreed', CALCULATED: 'Calculated' };
export const confidenceLabels: Record<string, string> = { CONFIRMED: 'Confirmed', CARRIED: 'Carried forward', ESTIMATED: 'Estimated', PROJECTED: 'Scheduled', UNRECORDED: 'Not recorded', PAUSED: 'Paused', UNKNOWN: 'Unknown' };
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const today = () => dateKey(new Date());
export function dateLabel(value?: string | null): string { return value ? parseLocalDate(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
export function money(value: number | null | undefined, currency: string, display: CurrencyDisplay = 'Symbol', decimals = 2): string { return value == null || !Number.isFinite(Number(value)) ? '—' : formatMoney(Number(value), currency, display, decimals); }
export const share = (value: number) => `${Number((value * 100).toFixed(2))}%`;
export function ageMonths(value?: string | null) { if (!value) return 0; const d = parseLocalDate(value), n = new Date(); return (n.getFullYear() - d.getFullYear()) * 12 + n.getMonth() - d.getMonth(); }
export function errorText(error: unknown) {
  const e = error as { response?: { status?: number; data?: { error?: string } }; message?: string };
  if (e.response?.status === 409) return `${e.response.data?.error ?? 'This record changed in another session.'} Your entries are kept. Close this editor and reload the latest record before trying again.`;
  return e.response?.data?.error ?? e.message ?? 'The save could not be confirmed. Keep this editor open and retry the same values; the retry will reuse its request key.';
}
export const buttonClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-wait disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';
export const primaryClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-wait disabled:opacity-50';
export const dangerClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-wait disabled:opacity-50';
export const inputClass = 'block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800';
export const tableHead = 'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400';
export const tableCell = 'border-b border-slate-100 px-4 py-3 text-xs text-slate-700 dark:border-slate-700/70 dark:text-slate-200';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={cn('rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800', className)}>{children}</section>; }
export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'amber' | 'red' | 'indigo' }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4', { neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', teal: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', amber: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300', indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' }[tone])}>{children}</span>;
}
export function Confidence({ value }: { value?: string | null }) { const v = value ?? 'UNKNOWN'; return <Pill tone={v === 'CONFIRMED' ? 'teal' : v === 'PAUSED' ? 'red' : ['UNKNOWN', 'CARRIED'].includes(v) ? 'amber' : 'neutral'}>{confidenceLabels[v] ?? v}</Pill>; }
export function Notice({ title, children, action, tone = 'amber' }: { title: string; children?: ReactNode; action?: ReactNode; tone?: 'amber' | 'red' | 'teal' }) {
  return <div role={tone === 'red' ? 'alert' : 'status'} className={cn('flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3', { amber: 'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200', red: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200', teal: 'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-200' }[tone])}><AlertCircle className="h-4 w-4 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{title}</p>{children && <div className="mt-1 text-xs leading-relaxed opacity-85">{children}</div>}</div>{action}</div>;
}
export function PropertyTile({ type, small = false }: { type?: string; small?: boolean }) { const Icon = type === 'HOUSE' ? Home : Building2; return <div className={cn('flex shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300', small ? 'h-8 w-8' : 'h-11 w-11')}><Icon className={small ? 'h-4 w-4' : 'h-5 w-5'} /></div>; }
export function EquityBar({ owned, debt, unknown = false }: { owned: number | null; debt: number | null; unknown?: boolean }) {
  const value = Math.max(0, Number(owned) || 0), owing = Math.max(0, Number(debt) || 0), negative = owing > value;
  return <div role="img" aria-label={unknown ? 'Equity unknown until financing is complete' : `Owned value ${value}, attributed debt ${owing}${negative ? ', negative equity' : ''}`} className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">{!unknown && <><span className={negative ? 'bg-red-500' : 'bg-teal-500'} style={{ width: `${Math.max(0, (value - owing) / Math.max(value, owing, 1)) * 100}%` }} /><span className="bg-violet-300 dark:bg-violet-500" style={{ width: `${Math.min(value, owing) / Math.max(value, owing, 1) * 100}%` }} />{negative && <span className="bg-red-500" style={{ width: `${(owing - value) / Math.max(owing, 1) * 100}%` }} />}</>}</div>;
}
export function Stats({ items }: { items: { label: string; value: string; sub?: ReactNode; pill?: ReactNode; negative?: boolean }[] }) { return <Card className="grid grid-cols-2 divide-y divide-slate-100 md:grid-cols-4 md:divide-x md:divide-y-0 dark:divide-slate-700">{items.map(item => <div key={item.label} className="min-w-0 p-4 md:p-5"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.label}</span>{item.pill}</div><div className={cn('font-mono text-lg font-semibold tracking-tight tabular-nums lg:text-[22px]', item.negative ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white')}>{item.value}</div>{item.sub && <div className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{item.sub}</div>}</div>)}</Card>; }
export function LoadingProperties() { return <div role="status" aria-label="Loading properties" className="space-y-4"><Card className="grid grid-cols-2 gap-6 p-5 md:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="space-y-3"><div className="h-2 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-700" /><div className="h-6 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-700" /></div>)}</Card><Card className="space-y-5 p-5">{[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />)}</Card></div>; }

export const loanName = (loan: { name?: string | null; lender?: string | null }) => loan.name || loan.lender || 'Mortgage';

/**
 * A declared loan is still missing. With another loan already open that may simply be stale, so
 * the caller can offer `onAllRecorded`: the explicit confirmation, never inferred.
 */
export function PendingMortgage({ view, onSetup, onAllRecorded, confirming = false }: { view: PropertyView; onSetup: () => void; onAllRecorded?: () => void; confirming?: boolean }) {
  if (view.property.financingStatus !== 'MORTGAGE_SETUP_PENDING') return null;
  const open = view.mortgages.some(loan => loan.status === 'ACTIVE');
  return <Notice title={open ? `${view.property.name}: a loan is still to be set up` : `${view.property.name}: property saved — finish mortgage setup`} action={<div className="flex flex-wrap gap-2">{open && onAllRecorded && <button className={buttonClass} disabled={confirming} onClick={onAllRecorded}>All loans are recorded</button>}<button className={primaryClass} onClick={onSetup}>{open ? 'Add loan' : 'Finish mortgage setup'}<ArrowRight className="h-3 w-3" /></button></div>}>{open ? 'Equity stays unknown until the missing loan is added. If every loan is already recorded, confirm it.' : 'Until its opening bank balance is added, debt and equity are unknown and totals are incomplete.'}</Notice>;
}

export interface FormField {
  name: string; label: string; type?: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'radio'; required?: boolean;
  /** description: radio options only, the line under the choice */
  options?: { value: string; label: string; description?: string }[]; help?: string | ((values: FormValues) => string | undefined); min?: number; max?: number; future?: boolean; disabled?: boolean;
  section?: string;
  /** Shown only while this holds. A hidden field keeps its value but is never validated: the caller ignores it. */
  visible?: (values: FormValues) => boolean;
  /** Under "More details": collapsed until opened, or until one of its fields fails validation. Still mounted, so it keeps its value. */
  advanced?: boolean;
}
export type FormValues = Record<string, string>;
export function Editor({ title, subtitle, fields, defaults, onClose, onSubmit, submitLabel = 'Save', children, preview, validate, danger = false, confirmDiscard = true }: {
  title: string; subtitle?: string; fields: FormField[]; defaults: FormValues; onClose: () => void;
  onSubmit: (values: FormValues) => Promise<void>; submitLabel?: string; children?: ReactNode;
  /** destructive action: red submit button */
  danger?: boolean;
  /** false for a what-if that saves nothing: closing it loses nothing */
  confirmDiscard?: boolean;
  preview?: (values: FormValues) => ReactNode; validate?: (values: FormValues) => Record<string, string | undefined>;
}) {
  const id = useId();
  const schema = useMemo(() => {
    const shape: Record<string, z.ZodType<string>> = {};
    for (const f of fields) shape[f.name] = z.string();
    // Checked on the whole form, so a field hidden by the others' values is skipped.
    return z.object(shape).superRefine((values, ctx) => {
      for (const f of fields) {
        if (f.visible && !f.visible(values)) continue;
        const v = values[f.name], issue = (message: string) => ctx.addIssue({ code: 'custom', path: [f.name], message });
        if (f.required && !v.trim()) issue(`${f.label} is required.`);
        if (v && f.type === 'number') {
          const n = Number(v);
          if (!Number.isFinite(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max)) issue(`Enter a valid ${f.label.toLowerCase()}${f.min != null ? ` (minimum ${f.min})` : ''}${f.max != null ? ` (maximum ${f.max})` : ''}.`);
        }
        if (v && f.type === 'date' && !f.future && v > today()) issue('Confirmed records cannot be dated in the future.');
      }
    });
  }, [fields]);
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const values = watch();
  const shown = (f: FormField) => !f.visible || f.visible(values);
  const advanced = fields.filter(f => f.advanced);
  const [moreOpen, setMoreOpen] = useState(false);
  const showMore = moreOpen || advanced.some(f => errors[f.name]);
  const field = (f: FormField) => { const help = typeof f.help === 'function' ? f.help(values) : f.help; return <div key={f.name}>{f.section && <h3 className="mb-3 border-t border-slate-200 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">{f.section}</h3>}{f.type === 'radio' ? <p id={`${id}-${f.name}`} className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-200">{f.label}</p> : <label htmlFor={`${id}-${f.name}`} className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-200">{f.label}{f.required ? ' *' : ''}</label>}{f.type === 'radio' ? <div role="radiogroup" aria-labelledby={`${id}-${f.name}`} className="space-y-2">{f.options?.map(o => <label key={o.value} className={cn('flex cursor-pointer gap-3 rounded-lg border p-3', values[f.name] === o.value ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20' : 'border-slate-200 dark:border-slate-700')}><input type="radio" value={o.value} disabled={isSubmitting} {...register(f.name)} className="mt-0.5 accent-teal-600" /><span><span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{o.label}</span>{o.description && <span className="mt-1 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{o.description}</span>}</span></label>)}</div> : f.disabled ? <><input type="hidden" {...register(f.name)} /><input id={`${id}-${f.name}`} value={f.options?.find(option => option.value === values[f.name])?.label ?? values[f.name] ?? defaults[f.name] ?? ''} readOnly aria-readonly="true" className={`${inputClass} bg-slate-50 dark:bg-slate-900/50`} /></> : f.type === 'select' ? <select id={`${id}-${f.name}`} disabled={f.disabled || isSubmitting} {...register(f.name)} className={inputClass}>{f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : f.type === 'textarea' ? <textarea id={`${id}-${f.name}`} disabled={isSubmitting} rows={3} {...register(f.name)} className={inputClass} /> : <input id={`${id}-${f.name}`} disabled={f.disabled || isSubmitting} type={f.type ?? 'text'} step={f.type === 'number' ? 'any' : undefined} min={f.min} max={f.type === 'date' && !f.future ? today() : f.max} {...register(f.name)} className={inputClass} />}{help && <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{help}</p>}{errors[f.name] && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{String(errors[f.name]?.message)}</p>}</div>; };
  const close = () => { if (isSubmitting) return; if (!confirmDiscard || !isDirty || window.confirm('Discard your unsaved changes?')) onClose(); };
  return <Dialog open onClose={close} className="relative z-50"><div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]" /><div className="fixed inset-0 flex justify-end"><DialogPanel className="flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-[440px] dark:bg-slate-800"><header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-700"><div><DialogTitle className="text-base font-semibold text-slate-900 dark:text-white">{title}</DialogTitle>{subtitle && <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>}</div><button aria-label="Close editor" type="button" onClick={close} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button></header><form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit(async v => {
    const custom = validate?.(v) ?? {}; if (Object.values(custom).some(Boolean)) { for (const [key, message] of Object.entries(custom)) if (message) setError(key, { message }); return; }
    try { await onSubmit(v); } catch (error) { setError('root.server', { message: errorText(error) }); }
  })}><div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}{fields.filter(f => !f.advanced && shown(f)).map(field)}{advanced.length > 0 && <div className="border-t border-slate-200 pt-3 dark:border-slate-700"><button type="button" aria-expanded={showMore} onClick={() => setMoreOpen(open => !open)} className="inline-flex items-center gap-1.5 rounded text-xs font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200">More details<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showMore && 'rotate-180')} /></button><div hidden={!showMore} className="mt-4 space-y-4">{advanced.filter(shown).map(field)}</div></div>}{preview?.(values)}{errors.root?.server && <Notice title="Save could not be confirmed" tone="red">{errors.root.server.message}</Notice>}</div><footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/40"><button type="button" disabled={isSubmitting} onClick={close} className={buttonClass}>Cancel</button><button type="submit" disabled={isSubmitting} className={danger ? dangerClass : primaryClass}>{isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}{isSubmitting ? 'Saving…' : submitLabel}</button></footer></form></DialogPanel></div></Dialog>;
}

