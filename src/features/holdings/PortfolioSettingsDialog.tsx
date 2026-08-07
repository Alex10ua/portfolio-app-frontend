import { useState } from 'react';
import { ArrowUp, ArrowDown, GripVertical, RotateCcw, Info } from 'lucide-react';
import Dialog from '../../components/ui/Dialog';
import CurrencySelect from '../../components/ui/CurrencySelect';
import { formatMoney, normalizeCurrency } from '../../lib/currency';
import type { Column } from './holdingsColumns';
import type { AssetType } from '../../types/holding';
import type { CurrencyDisplay } from '../../types/settings';

type SortOrder = 'asc' | 'desc';

interface Props {
  open: boolean;
  onClose: () => void;
  /** all columns in display order */
  columns: Column[];
  onToggleColumn: (key: string) => void;
  onMoveColumn: (fromKey: string, toKey: string) => void;
  sortBy: string;
  sortOrder: SortOrder;
  onSortChange: (key: string, order: SortOrder) => void;
  assetFilter: AssetType | 'ALL';
  assetTypes: string[];
  onAssetFilterChange: (filter: AssetType | 'ALL') => void;
  /** currency every total/chart is converted to */
  baseCurrency: string;
  onBaseCurrencyChange: (code: string) => void;
  /** currency codes the portfolio actually holds — surfaced first in the picker */
  heldCurrencies: string[];
  currencyDisplay: CurrencyDisplay;
  onCurrencyDisplayChange: (display: CurrencyDisplay) => void;
  /** portfolio value in baseCurrency, for the live notation preview */
  previewValue: number;
  onReset: () => void;
}

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2';
const selectClass = 'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200';
const DISPLAY_OPTIONS: CurrencyDisplay[] = ['Symbol', 'Code', 'Both'];

export default function PortfolioSettingsDialog({
  open, onClose, columns, onToggleColumn, onMoveColumn,
  sortBy, sortOrder, onSortChange, assetFilter, assetTypes, onAssetFilterChange,
  baseCurrency, onBaseCurrencyChange, heldCurrencies, currencyDisplay, onCurrencyDisplayChange,
  previewValue, onReset,
}: Props) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const visibleCount = columns.filter((c) => c.visible).length;
  // Foreign holdings exist → say so, since every total then depends on the FX rate.
  const foreignCurrencies = [...new Set(heldCurrencies.map(normalizeCurrency))]
    .filter((c) => c !== normalizeCurrency(baseCurrency));

  return (
    <Dialog open={open} onClose={onClose} title="Portfolio Settings">
      <p className="text-[12px] text-slate-500 dark:text-slate-400 -mt-1 mb-4">
        Saved per portfolio and synced to your account — each portfolio keeps its own layout.
      </p>

      <div className="space-y-5">
        {/* Currency */}
        <section>
          <div className={sectionTitle}>Currency</div>
          <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-2">
            All totals and charts are shown in this currency
          </div>
          <CurrencySelect value={baseCurrency} onChange={onBaseCurrencyChange} held={heldCurrencies} />

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">Show as</span>
            <div className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 p-0.5">
              {DISPLAY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onCurrencyDisplayChange(opt)}
                  className={`rounded px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                    currencyDisplay === opt
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between gap-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
            <span className="text-[11.5px] text-slate-500 dark:text-slate-400">Portfolio value</span>
            <span className="font-mono text-[15px] font-bold tabular-nums text-slate-900 dark:text-white">
              {formatMoney(previewValue, baseCurrency, currencyDisplay, 2)}
            </span>
          </div>

          {foreignCurrencies.length > 0 && (
            <div className="mt-2.5 flex gap-2 rounded-md border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-2">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-200">
                {foreignCurrencies.join(', ')} {foreignCurrencies.length === 1 ? 'holding is' : 'holdings are'} converted
                at today's ECB rate. Transactions and per-row figures keep the currency they were booked in.
              </div>
            </div>
          )}
        </section>

        {/* Table columns */}
        <section>
          <div className={sectionTitle}>Table Columns</div>
          <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-2">Drag to reorder, tick to show</div>
          <div className="space-y-1">
            {columns.map((col) => {
              const isLastVisible = col.visible && visibleCount === 1;
              return (
                <div
                  key={col.key}
                  draggable
                  onDragStart={() => setDragKey(col.key)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragKey && dragKey !== col.key) onMoveColumn(dragKey, col.key);
                  }}
                  onDrop={(e) => e.preventDefault()}
                  onDragEnd={() => setDragKey(null)}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 border transition-colors ${
                    dragKey === col.key
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 opacity-70'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-slate-400 dark:text-slate-500 cursor-grab flex-shrink-0" />
                  <label className={`flex items-center gap-3 flex-1 cursor-pointer ${isLastVisible ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={col.visible}
                      disabled={isLastVisible}
                      onChange={() => onToggleColumn(col.key)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{col.label}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        {/* Default sort + asset filter */}
        <section>
          <div className={sectionTitle}>Default View</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Sort by</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value, sortOrder)}
                  className={selectClass}
                >
                  {columns.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  className="flex-shrink-0 rounded-md border border-slate-200 dark:border-slate-700 px-2 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Asset filter</label>
              <select
                value={assetFilter}
                onChange={(e) => onAssetFilterChange(e.target.value as AssetType | 'ALL')}
                className={selectClass}
              >
                <option value="ALL">ALL</option>
                {assetTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

      </div>

      <div className="flex justify-between items-center mt-5">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to defaults
        </button>
        <button
          onClick={onClose}
          className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Done
        </button>
      </div>
    </Dialog>
  );
}
