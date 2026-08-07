import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { CURRENCIES, currencyMeta, normalizeCurrency } from '../../lib/currency';

interface Props {
  value: string;
  onChange: (code: string) => void;
  /** currency codes actually present in the portfolio — listed first */
  held?: string[];
  className?: string;
}

/** Monospace code chip standing in for a flag — no image assets needed. */
export function FlagTag({ code, small }: { code: string; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono font-bold tracking-wide text-slate-500 dark:text-slate-400 ${
        small ? 'h-5 w-[27px] text-[9px]' : 'h-[22px] w-[30px] text-[10px]'
      }`}
    >
      {code}
    </span>
  );
}

export default function CurrencySelect({ value, onChange, held = [], className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  // Click-away close — the dropdown is not modal, it sits inside the settings dialog.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const selected = currencyMeta(value);
  const matches = (c: { code: string; name: string }) =>
    !query || `${c.code} ${c.name}`.toLowerCase().includes(query.toLowerCase());

  const heldCodes = [...new Set(held.map(normalizeCurrency))];
  const suggested = heldCodes.map((c) => currencyMeta(c)).filter(matches);
  const rest = CURRENCIES.filter((c) => !heldCodes.includes(c.code)).filter(matches);

  const renderGroup = (label: string, items: ReturnType<typeof currencyMeta>[]) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {label}
        </div>
        {items.map((c) => {
          const active = c.code === normalizeCurrency(value);
          return (
            <button
              key={`${label}-${c.code}`}
              type="button"
              onClick={() => { onChange(c.code); setOpen(false); setQuery(''); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                active ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <FlagTag code={c.flag} small />
              <span className="w-9 font-mono text-[12.5px] font-bold text-slate-900 dark:text-slate-100">{c.code}</span>
              <span className="flex-1 truncate text-[12.5px] text-slate-500 dark:text-slate-400">{c.name}</span>
              <span className="font-mono text-[12px] text-slate-400 dark:text-slate-500">{c.symbol}</span>
              {active && <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2.5 rounded-md border bg-white dark:bg-slate-800 px-3 py-2 text-left transition-colors ${
          open
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
        }`}
      >
        <FlagTag code={selected.flag} />
        <span className="font-mono text-[13.5px] font-bold text-slate-900 dark:text-slate-100">{selected.code}</span>
        <span className="flex-1 truncate text-[13px] text-slate-500 dark:text-slate-400">{selected.name}</span>
        <span className="font-mono text-[13px] text-slate-400 dark:text-slate-500">{selected.symbol}</span>
        {open
          ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-slate-400" />
          : <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
          <div className="border-b border-slate-200 dark:border-slate-700 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search currency or code…"
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1.5 pl-8 pr-2.5 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="max-h-[268px] overflow-y-auto">
            {renderGroup('In this portfolio', suggested)}
            {renderGroup('All currencies', rest)}
            {suggested.length === 0 && rest.length === 0 && (
              <div className="px-3 py-4 text-center text-[12.5px] text-slate-500 dark:text-slate-400">
                No currency matches “{query}”
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
