import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight, TrendingUp, FolderOpen, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePortfolios, useCreatePortfolio, useUpdatePortfolio, useDeletePortfolio } from '../../hooks/usePortfolios';
import type { Portfolio } from '../../types/portfolio';
import { usePortfolioValues } from '../../hooks/usePortfolioValues';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import Dialog from '../../components/ui/Dialog';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';

const schema = z.object({
  portfolioName: z.string().min(1, 'Name is required'),
  description: z.string(),
});
type FormValues = z.infer<typeof schema>;

const PALETTE = [
  '#4F46E5', '#14B8A6', '#F59E0B', '#8B5CF6',
  '#EF4444', '#10B981', '#3B82F6', '#EC4899',
];

function AllocBar({ segments }: { segments: { weight: number; color: string; label: string }[] }) {
  return (
    <div className="flex w-full rounded-full overflow-hidden" style={{ height: 6 }}>
      {segments.map((s, i) => (
        <div key={i} style={{ flex: s.weight, background: s.color }} title={`${s.label} ${s.weight.toFixed(1)}%`} />
      ))}
    </div>
  );
}

export default function PortfolioListPage() {
  const [open, setOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Portfolio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const { data: portfolios = [], isLoading, error } = usePortfolios();
  const { mutateAsync: createPortfolio, isPending } = useCreatePortfolio();
  const { mutateAsync: renamePortfolio, isPending: renaming } = useUpdatePortfolio();
  const { mutateAsync: removePortfolio, isPending: deleting } = useDeletePortfolio();

  const { items, total, totalCost, totalCurrency, isLoading: isLoadingValues } = usePortfolioValues(portfolios);

  // Biggest portfolio first; portfolios whose value hasn't loaded yet sink to the end.
  // Cards and the allocation summary use the same order so PALETTE colors line up.
  const orderedPortfolios = useMemo(() => {
    const valueOf = (id: number) => items.find((it) => it.portfolioId === id)?.value ?? -1;
    return [...portfolios].sort((a, b) => valueOf(b.portfolioId) - valueOf(a.portfolioId));
  }, [portfolios, items]);
  const orderedItems = useMemo(
    () => [...items].sort((a, b) => b.value - a.value),
    [items],
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { portfolioName: '', description: '' },
  });

  // Separate form instance so the rename dialog doesn't clobber the create form state
  const renameForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { portfolioName: '', description: '' },
  });

  const onSubmit = async (data: FormValues) => {
    await createPortfolio(data);
    reset();
    setOpen(false);
  };

  const openRename = (portfolio: Portfolio) => {
    renameForm.reset({
      portfolioName: portfolio.portfolioName,
      description: portfolio.description ?? '',
    });
    setRenameTarget(portfolio);
  };

  const onRenameSubmit = async (data: FormValues) => {
    if (!renameTarget) return;
    await renamePortfolio({ portfolioId: String(renameTarget.portfolioId), payload: data });
    setRenameTarget(null);
  };

  const onDeleteConfirm = async () => {
    if (!deleteTarget || deleteConfirmName !== deleteTarget.portfolioName) return;
    await removePortfolio(String(deleteTarget.portfolioId));
    setDeleteTarget(null);
    setDeleteConfirmName('');
  };

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading portfolios" message={(error as Error).message} />;

  const totalProfit = total - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Aggregate summary card */}
      {portfolios.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          {isLoadingValues ? (
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-48 bg-slate-100 dark:bg-slate-700 rounded" />
              <div className="h-4 w-64 bg-slate-100 dark:bg-slate-700 rounded" />
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full mt-4" />
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-6">
                {/* Net worth */}
                <div className="flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                    Net Worth · All Portfolios
                  </div>
                  <div className="text-[32px] font-bold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
                    {formatCurrency(total, undefined, totalCurrency)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`flex items-center gap-1 text-[13px] font-semibold tabular-nums ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      <TrendingUp className="h-3.5 w-3.5" />
                      {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit, undefined, totalCurrency)}
                    </span>
                    <span className={`text-[13px] font-semibold tabular-nums ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                      ({totalProfit >= 0 ? '+' : ''}{formatPercent(totalProfitPct)})
                    </span>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">total unrealized P&amp;L</span>
                  </div>
                </div>

                <div className="hidden sm:block w-px self-stretch bg-slate-200 dark:bg-slate-700" />

                {/* Cost basis */}
                <div className="sm:w-48">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Cost Basis</div>
                  <div className="text-[20px] font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(totalCost, undefined, totalCurrency)}
                  </div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">across {portfolios.length} portfolios</div>
                </div>
              </div>

              {/* Allocation bar — one segment per portfolio */}
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                Allocation by Portfolio
              </div>
              <div className="flex w-full rounded-full overflow-hidden" style={{ height: 10 }}>
                {orderedItems.map((item, i) => {
                  const pct = total > 0 ? (item.value / total) * 100 : 0;
                  return (
                    <div
                      key={item.portfolioId}
                      style={{ flex: pct, background: PALETTE[i % PALETTE.length] }}
                      title={`${item.name}: ${pct.toFixed(1)}%`}
                      className="transition-opacity hover:opacity-80"
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                {orderedItems.map((item, i) => {
                  const pct = total > 0 ? (item.value / total) * 100 : 0;
                  return (
                    <div key={item.portfolioId} className="flex items-center gap-1.5 text-[12px]">
                      <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums">{pct.toFixed(1)}%</span>
                      <span className="text-slate-400 dark:text-slate-500 tabular-nums">· {formatCurrency(item.value, 0, item.currency)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Portfolio list header */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-[14px] font-semibold text-slate-900 dark:text-white">
          {portfolios.length > 0 ? 'Your portfolios' : ''}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Portfolio
        </button>
      </div>

      {portfolios.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No portfolios yet" description="Create your first portfolio to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orderedPortfolios.map((portfolio, idx) => {
            const color = PALETTE[idx % PALETTE.length];
            const letter = portfolio.portfolioName.charAt(0).toUpperCase();
            const item = items.find((it) => it.portfolioId === portfolio.portfolioId);

            return (
              <Link
                key={portfolio.portfolioId}
                to={`/${portfolio.portfolioId}`}
                className="group bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
              >
                {/* Header row */}
                <div className="flex items-center gap-3 mb-5">
                  <span
                    className="inline-flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0 text-sm"
                    style={{ width: 36, height: 36, background: color }}
                  >
                    {letter}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div title={portfolio.portfolioName} className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">
                      {portfolio.portfolioName}
                    </div>
                    {item && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.assetCount} assets · {item.currency}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Rename portfolio"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openRename(portfolio); }}
                    className="p-1.5 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex-shrink-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete portfolio"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirmName(''); setDeleteTarget(portfolio); }}
                    className="p-1.5 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                </div>

                {isLoadingValues || !item ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 w-32 bg-slate-100 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
                  </div>
                ) : (
                  <>
                    {/* Value */}
                    <div className="mb-4">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Total Value</div>
                      <div className="text-[20px] font-semibold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(item.value, undefined, item.currency)}
                      </div>
                    </div>

                    {/* P&L */}
                    <div className="flex gap-6 mb-4">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Cost Basis</div>
                        <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                          {formatCurrency(item.cost, undefined, item.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">P&amp;L</div>
                        <div className={`text-[13px] font-semibold tabular-nums ${item.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          {item.profit >= 0 ? '+' : ''}{formatCurrency(item.profit, undefined, item.currency)}
                          {' '}
                          <span className="font-medium opacity-85">({item.profit >= 0 ? '+' : ''}{formatPercent(item.profitPct)})</span>
                        </div>
                      </div>
                    </div>

                    {/* Allocation bar */}
                    {item.allocation.length > 0 && (
                      <>
                        <AllocBar segments={item.allocation} />
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                          {item.allocation.map((a) => (
                            <div key={a.label} className="flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                              <span className="inline-block w-1.5 h-1.5 rounded-sm" style={{ background: a.color }} />
                              {a.label} {a.weight.toFixed(0)}%
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Create portfolio dialog */}
      <Dialog open={open} onClose={() => { reset(); setOpen(false); }} title="Create New Portfolio">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Portfolio Name</label>
            <input
              autoFocus
              {...register('portfolioName')}
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Global Growth"
            />
            {errors.portfolioName && <p className="mt-1 text-xs text-red-600">{errors.portfolioName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <input
              {...register('description')}
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Optional"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { reset(); setOpen(false); }}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
              {isPending ? 'Creating…' : 'Create Portfolio'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Rename portfolio dialog */}
      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title={`Rename Portfolio — ${renameTarget?.portfolioName ?? ''}`}
      >
        <form onSubmit={renameForm.handleSubmit(onRenameSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Portfolio Name</label>
            <input
              autoFocus
              {...renameForm.register('portfolioName')}
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {renameForm.formState.errors.portfolioName && (
              <p className="mt-1 text-xs text-red-600">{renameForm.formState.errors.portfolioName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <input
              {...renameForm.register('description')}
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Optional"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setRenameTarget(null)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={renaming}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
              {renaming ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete portfolio confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => { setDeleteTarget(null); setDeleteConfirmName(''); }}
        title="Delete Portfolio"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <p className="font-semibold mb-1">This cannot be undone.</p>
              <p>
                Deleting <strong>{deleteTarget?.portfolioName}</strong> permanently removes all its data:
                transactions, holdings, custom assets, cash holdings, imports, tags and notes.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Type <span className="font-semibold">{deleteTarget?.portfolioName}</span> to confirm
            </label>
            <input
              autoFocus
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={deleteTarget?.portfolioName}
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setDeleteTarget(null); setDeleteConfirmName(''); }}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onDeleteConfirm()}
              disabled={deleting || deleteConfirmName !== deleteTarget?.portfolioName}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete Portfolio'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
