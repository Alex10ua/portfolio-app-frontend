import { useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useWealthHistory } from '../../hooks/useWealth';
import { useFxRates } from '../../hooks/useFxRates';
import { convertWealthMap } from '../../lib/wealth';
import { formatMoney } from '../../lib/currency';
import { formatDate } from '../../lib/formatters';
import Spinner from '../../components/ui/Spinner';
import type { CurrencyDisplay } from '../../types/settings';

export default function WealthHistoryChart({ portfolioId, baseCurrency, currencyDisplay, startMonth, view: chosenView, onViewChange, includeProperty = true }: {
  portfolioId: string; baseCurrency: string; currencyDisplay: CurrencyDisplay; startMonth?: string;
  view: 'COMBINED' | 'INVESTMENTS'; onViewChange: (view: 'COMBINED' | 'INVESTMENTS') => void;
  /** false = real estate hidden for this portfolio: investments only, no view toggle */
  includeProperty?: boolean;
}) {
  const view = includeProperty ? chosenView : 'INVESTMENTS';
  const { data, isLoading, error, refetch } = useWealthHistory(portfolioId, includeProperty);
  const rates = useFxRates();
  const [table, setTable] = useState(false);
  const money = (value: number | null) => value == null ? '—' : formatMoney(value, baseCurrency, currencyDisplay);
  if (isLoading) return <div className="flex h-48 items-center justify-center"><Spinner /></div>;
  if (error) return <div className="py-6 text-sm text-amber-700 dark:text-amber-400">History unavailable. <button className="underline" onClick={() => void refetch()}>Retry</button></div>;
  const points = (data ?? []).filter(p => !startMonth || p.date.slice(0, 7) >= startMonth).map(point => {
    const inv = convertWealthMap(point.investmentValueByCurrency, baseCurrency, rates);
    const equity = convertWealthMap(point.propertyEquityByCurrency, baseCurrency, rates);
    const investment = inv.complete ? inv.value : null;
    const total = !point.complete || !inv.complete || !equity.complete ? null : inv.value + equity.value;
    return { date: point.date, investment, equity: point.complete && equity.complete ? equity.value : null, total,
      band: total == null || investment == null ? null : [Math.min(investment, total), Math.max(investment, total)],
      estimated: (includeProperty && point.estimatedPropertyIds.length > 0) || point.estimatedPriceTickers.length > 0,
      missing: [...inv.missing, ...equity.missing], complete: point.complete };
  });
  const incomplete = points.some(p => !p.complete || p.missing.length > 0);
  const estimated = points.some(p => p.estimated);
  const hasProperty = (data ?? []).some(p => Object.keys(p.ownedPropertyValueByCurrency).length > 0 || !p.complete);
  const combined = view === 'COMBINED';
  if (!points.length) return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No values in this date range.</p>;
  return <div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      {includeProperty ? <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-900/40">
        {(['COMBINED', 'INVESTMENTS'] as const).map(option => <button key={option} onClick={() => onViewChange(option)} aria-pressed={view === option}
          className={`rounded px-3 py-1.5 font-medium ${view === option ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {option === 'COMBINED' ? hasProperty ? 'Investments + property equity' : 'Combined value' : 'Investments only'}
        </button>)}
      </div> : <span />}
      <button onClick={() => setTable(!table)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{table ? 'Show chart' : 'View data table'}</button>
    </div>
    {incomplete && combined && <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">Some equity or FX records are unavailable. Gaps indicate incomplete combined values; known investment values remain visible.</p>}
    {estimated && <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">{combined ? 'Estimates include scheduled repayments or carried balances. Open a property for its confirmation dates.' : 'Some historical investment prices are estimated.'}</p>}
    {table ? <div className="max-h-72 overflow-auto"><table className="w-full text-right text-xs text-slate-700 dark:text-slate-200"><caption className="sr-only">Investment and property equity history, cash excluded</caption><thead><tr><th className="p-2 text-left">Date</th><th className="p-2">Investments</th>{combined && <><th className="p-2">Property equity</th><th className="p-2">Combined</th></>}</tr></thead><tbody>{points.map(p => <tr key={p.date} className="border-t border-slate-100 dark:border-slate-700"><td className="p-2 text-left">{formatDate(p.date)}</td><td className="p-2 font-mono">{money(p.investment)}</td>{combined && <><td className="p-2 font-mono">{money(p.equity)}</td><td className="p-2 font-mono">{money(p.total)}{p.estimated ? ' *' : ''}</td></>}</tr>)}</tbody></table></div>
      : <div className="h-64 w-full" role="img" aria-label={`${combined ? 'Investment and property equity' : 'Investment'} month-end value chart in ${baseCurrency}; cash excluded. Use View data table for values.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ left: 4, right: 8, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#64748b33" />
            <XAxis dataKey="date" tickFormatter={date => date.slice(0, 7)} minTickGap={38} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis width={84} tickFormatter={value => formatMoney(Number(value), baseCurrency, currencyDisplay, 0)} tick={{ fill: '#94a3b8', fontSize: 10 }} domain={['auto', 'auto']} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"><div className="mb-2 font-semibold">{formatDate(String(label))}</div><div>Investments: {money(payload[0].payload.investment)}</div>{combined && <><div>Property equity: {money(payload[0].payload.equity)}</div><div className="mt-1 font-semibold">Combined: {money(payload[0].payload.total)}</div></>}{payload[0].payload.estimated && <div className="mt-1 text-amber-600 dark:text-amber-400">Includes estimated/carried balances</div>}</div> : null} />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Area type="stepAfter" dataKey="investment" name="Investments" fill="#4f46e5" fillOpacity={0.12} stroke="#4f46e5" strokeWidth={2} isAnimationActive={false} />
            {combined && <><Area type="stepAfter" dataKey="band" name="Property equity band" fill="#14b8a6" fillOpacity={0.16} stroke="none" isAnimationActive={false} /><Line type="stepAfter" dataKey="total" name="Combined value" stroke="#0d9488" strokeWidth={2.2} dot={false} connectNulls={false} isAnimationActive={false} /></>}
          </ComposedChart>
        </ResponsiveContainer>
      </div>}
    <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400"><span><span className="mr-1 text-indigo-500">━</span>Investments</span>{combined && <span><span className="mr-1 text-teal-500">━</span>Investments + property equity</span>}<span className="ml-auto">Cash excluded · current FX</span></div>
  </div>;
}
