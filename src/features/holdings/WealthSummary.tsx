import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Plus, AlertTriangle } from 'lucide-react';
import { useWealth } from '../../hooks/useWealth';
import { useFxRates } from '../../hooks/useFxRates';
import { summarizeWealth } from '../../lib/wealth';
import { formatMoney } from '../../lib/currency';
import { formatDate } from '../../lib/formatters';
import type { CurrencyDisplay } from '../../types/settings';

const card = 'rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800';

export function NetWorthBand({ portfolioId, baseCurrency, currencyDisplay, includeProperty = true }: {
  portfolioId: string; baseCurrency: string; currencyDisplay: CurrencyDisplay;
  /** false = real estate hidden for this portfolio: investments + cash only */
  includeProperty?: boolean;
}) {
  const { data, isLoading, error, refetch } = useWealth(portfolioId);
  const rates = useFxRates();
  const money = (value: number) => formatMoney(value, baseCurrency, currencyDisplay);
  if (isLoading) return <div className={`${card} h-40 animate-pulse p-6`} aria-label="Loading net worth" />;
  if (error || !data) return <div className={`${card} p-5 text-sm text-amber-700 dark:text-amber-400`}>
    Net worth is unavailable. <button className="underline" onClick={() => void refetch()}>Retry</button>
  </div>;
  const total = summarizeWealth(data, baseCurrency, rates, includeProperty);
  const terms = [
    { label: 'Investments', value: total.investments, sub: 'Holdings · FIFO', color: 'bg-indigo-500', sign: '', unknown: false },
    { label: 'Manual cash', value: total.cash, sub: 'Today only', color: 'bg-amber-500', sign: '+ ', unknown: false },
    ...(includeProperty ? [
      { label: 'Your share of value', value: total.owned, sub: `${data.properties.length} properties`, color: 'bg-teal-500', sign: '+ ', unknown: false },
      { label: 'Attributed mortgage', value: total.debt, sub: 'Principal only', color: 'bg-slate-400', sign: '− ', unknown: data.missingPropertyIds.length > 0 },
    ] : []),
  ];
  return <section className={`${card} grid gap-6 p-5 lg:grid-cols-[minmax(220px,1fr)_2fr]`} aria-label="Net worth breakdown">
    <div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Net worth ({baseCurrency})
        <span className={`rounded-full px-2 py-1 text-[10px] normal-case tracking-normal ${total.complete ? 'bg-slate-100 dark:bg-slate-700' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
          {total.complete ? includeProperty && data.properties.length ? 'Includes estimates' : 'Current value' : 'Incomplete · known subtotal'}
        </span>
      </div>
      <div className="mt-2 font-mono text-[30px] font-bold tracking-tight text-slate-900 dark:text-white">{money(total.total)}</div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {total.missingFx.length ? `FX unavailable for ${total.missingFx.join(', ')}. Those amounts remain in native currency below.`
          : !includeProperty ? 'Investments + manual cash, today. Real estate is hidden for this portfolio.'
          : !data.complete ? 'Some values are unknown and excluded from this subtotal. Finish mortgage setup or update the missing records.'
          : 'Investments + cash + property equity, today. Property values are your estimates.'}
      </p>
      {data.missingInvestmentTickers.length > 0 && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Missing prices: {data.missingInvestmentTickers.join(', ')}.</p>}
    </div>
    <div>
      <div className={`grid grid-cols-2 gap-x-5 gap-y-4 ${includeProperty ? 'sm:grid-cols-4' : ''}`}>
        {terms.map(term => <div key={term.label}>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"><span className={`h-2 w-2 rounded-sm ${term.color}`} />{total.complete ? term.sign : ''}{term.label}</div>
          <div className="mt-1 font-mono text-base font-semibold text-slate-900 dark:text-white">{money(term.value)}{term.unknown ? ' + unknown' : ''}</div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{term.sub}</div>
        </div>)}
      </div>
      {includeProperty && !total.complete && <p className="mt-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">The figures above may be partial. Properties with unknown equity are excluded from the net worth subtotal.</p>}
      {includeProperty && <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-700">
        <span className="text-slate-500 dark:text-slate-400">Property equity</span><span className={`font-mono font-semibold ${total.equity < 0 ? 'text-red-600 dark:text-red-400' : 'text-teal-700 dark:text-teal-400'}`}>{money(total.equity)}{data.missingPropertyIds.length > 0 || total.missingFx.length > 0 ? ' + unknown' : ''}</span>
      </div>}
    </div>
  </section>;
}

export function RealEstateDashboardCard({ portfolioId }: { portfolioId: string }) {
  const { data, isLoading, error, refetch } = useWealth(portfolioId);
  const href = `/${encodeURIComponent(portfolioId)}/real-estate`;
  return <section className={`${card} overflow-hidden`}>
    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />Real Estate <span className="text-slate-400">{data?.properties.length ?? ''}</span></h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Each property in its own currency · mortgage principal only</p></div>
      <div className="flex items-center gap-3 text-xs font-semibold"><Link to={`${href}?add=1`} className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400"><Plus className="h-3.5 w-3.5" />Add property</Link><Link to={href} className="flex items-center gap-1 text-slate-600 dark:text-slate-300">Open Real Estate<ChevronRight className="h-3.5 w-3.5" /></Link></div>
    </div>
    {isLoading ? <div className="h-20 animate-pulse bg-slate-50 dark:bg-slate-900/30" />
      : error || !data ? <div className="px-5 pb-5 text-sm text-amber-700 dark:text-amber-400">Property data unavailable. <button className="underline" onClick={() => void refetch()}>Retry</button></div>
      : data.properties.length === 0 ? <p className="px-5 pb-5 text-sm text-slate-500 dark:text-slate-400">Add a home, rental or plot to track its value and mortgage equity.</p>
      : data.properties.map(view => {
        const p = view.property, summary = view.debt;
        const money = (value: number | null) => value == null ? '—' : formatMoney(value, p.currency);
        const pending = !view.complete;
        const needRate = summary?.rateNeeded;
        // Several open loans: their rates side by side, through the earliest fixation end.
        const periods = view.mortgages.filter(m => m.status === 'ACTIVE').map(m => view.loanSummaries[m.id]?.currentRatePeriod).filter(period => period != null);
        return <Link key={p.id} to={`${href}/${encodeURIComponent(p.id)}`} className="grid grid-cols-2 items-center gap-3 border-t border-slate-100 px-5 py-3 hover:bg-slate-50 sm:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] dark:border-slate-700 dark:hover:bg-slate-700/30">
          <div className="col-span-2 sm:col-span-1"><div className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400">{p.name}</div><div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{p.propertyType.toLowerCase()} · {Number((p.ownershipShare * 100).toFixed(2))}% owned{view.latestValuation ? ` · valued ${formatDate(view.latestValuation.effectiveDate)}` : ''}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Your share</div><div className="mt-1 font-mono text-xs font-semibold text-slate-900 dark:text-white">{money(view.ownedValue)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Mortgage</div><div className="mt-1 font-mono text-xs font-semibold text-slate-900 dark:text-white">{money(view.attributedMortgagePrincipal)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Equity</div><div className={`mt-1 font-mono text-xs font-bold ${(view.equity ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-teal-700 dark:text-teal-400'}`}>{money(view.equity)}</div></div>
          <div className="text-[11px] text-slate-500 sm:text-right dark:text-slate-400">{summary?.attributedMonthlyPayment != null && <div className="font-mono">{money(summary.attributedMonthlyPayment)}/mo</div>}{pending || needRate ? <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><AlertTriangle className="h-3 w-3" />{p.financingStatus === 'MORTGAGE_SETUP_PENDING' ? 'Finish setup' : needRate ? 'New rate needed' : 'Incomplete'}</span> : periods.length ? <span>{periods.map(period => `${period.annualNominalRatePercent}%`).join(" · ")} through {formatDate(periods.map(period => period.fixedUntil).sort()[0])}</span> : 'Mortgage free'}</div>
        </Link>;
      })}
  </section>;
}
