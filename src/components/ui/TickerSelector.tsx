import { Menu as HMenu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import StockLogo from './StockLogo';
import type { Holding } from '../../types/holding';

interface Props {
  holdings: Holding[];
  selected: Holding;
  onSelect: (ticker: string) => void;
  /** Heading above the list, e.g. "Stock holdings". */
  groupLabel?: string;
}

/**
 * Ticker scope picker for ticker-level pages (Statistics, Historical). The data
 * behind those pages is per-ticker, not per-portfolio, so the page needs an
 * explicit scope control; the list is the portfolio's own holdings.
 */
export default function TickerSelector({ holdings, selected, onSelect, groupLabel = 'In this portfolio' }: Props) {
  return (
    <HMenu as="div" className="relative">
      <MenuButton className="flex items-center gap-3 pl-2.5 pr-3 py-1.5 min-w-[280px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
        <StockLogo ticker={selected.ticker} name={selected.name} assetType={selected.assetType} size="sm" />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums">{selected.ticker}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{selected.name}</div>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
      </MenuButton>
      <MenuItems
        anchor="bottom start"
        className="z-40 mt-1.5 w-[340px] max-h-[340px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg focus:outline-none"
      >
        <div className="px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
          {groupLabel} · {holdings.length}
        </div>
        {holdings.map((h) => {
          const active = h.ticker === selected.ticker;
          return (
            <MenuItem key={h.ticker}>
              <button
                onClick={() => onSelect(h.ticker)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left ${
                  active ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'data-[focus]:bg-slate-50 dark:data-[focus]:bg-slate-700/50'
                }`}
              >
                <StockLogo ticker={h.ticker} name={h.name} assetType={h.assetType} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className={`text-[12.5px] font-bold tabular-nums ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                    {h.ticker}
                  </div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">{h.name}</div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {h.assetType}
                </span>
              </button>
            </MenuItem>
          );
        })}
      </MenuItems>
    </HMenu>
  );
}
