import { useState } from 'react';
import { ArrowUp, ArrowDown, GripVertical, RotateCcw } from 'lucide-react';
import Dialog from '../../components/ui/Dialog';
import type { Column } from './holdingsColumns';
import type { AssetType } from '../../types/holding';

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
  onReset: () => void;
}

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2';
const selectClass = 'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200';

export default function PortfolioSettingsDialog({
  open, onClose, columns, onToggleColumn, onMoveColumn,
  sortBy, sortOrder, onSortChange, assetFilter, assetTypes, onAssetFilterChange,
  onReset,
}: Props) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const visibleCount = columns.filter((c) => c.visible).length;

  return (
    <Dialog open={open} onClose={onClose} title="Portfolio Settings">
      <p className="text-[12px] text-slate-500 dark:text-slate-400 -mt-1 mb-4">
        Saved per portfolio and synced to your account — each portfolio keeps its own layout.
      </p>

      <div className="space-y-5">
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
