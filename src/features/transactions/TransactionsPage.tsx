import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit2, Trash2, ListFilter } from 'lucide-react';
import { useTransactions, useUpdateTransaction, useDeleteTransaction } from '../../hooks/useTransactions';
import { useFirstTradeYear } from '../../hooks/useHoldings';
import SkeletonRow from '../../components/ui/SkeletonRow';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import Dialog from '../../components/ui/Dialog';
import { formatDate, formatCurrency } from '../../lib/formatters';
import { parseLocalDate, toDateInputValue } from '../../lib/dates';
import StockLogo from '../../components/ui/StockLogo';
import type { Transaction, TransactionType, Currency } from '../../types/transaction';

const editSchema = z.object({
  ticker: z.string().min(1),
  transactionType: z.enum(['BUY', 'SELL', 'TAX', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL']),
  quantity: z.string().min(1),
  price: z.string().min(1),
  commission: z.string(),
  date: z.string().min(1),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CHF', 'PLN', 'CZK']),
});
type EditValues = z.infer<typeof editSchema>;

const selectClass = 'block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100';
const inputClass = 'block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100';

export default function TransactionsPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId!;

  const currentYear = new Date().getFullYear();
  const cachedFirst = parseInt(localStorage.getItem(`firstTradeYear-${pid}`) ?? String(currentYear), 10);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const { data: transactions, isLoading, error } = useTransactions(pid, selectedYear);
  const { data: firstTradeYear } = useFirstTradeYear(pid);
  const { mutateAsync: updateTransaction, isPending: updating } = useUpdateTransaction(pid, selectedYear);
  const { mutateAsync: deleteTransaction, isPending: deleting } = useDeleteTransaction(pid, selectedYear);

  const firstYear = firstTradeYear ?? cachedFirst;
  // Most recent year first
  const yearOptions = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => currentYear - i);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
  });

  const openEdit = (t: Transaction) => {
    setEditTarget(t);
    reset({
      ticker: t.ticker,
      transactionType: t.transactionType,
      quantity: String(t.quantity),
      price: String(t.price),
      commission: String(t.commission ?? 0),
      date: toDateInputValue(t.date),
      currency: t.currency,
    });
  };

  const onEdit = async (data: EditValues) => {
    if (!editTarget) return;
    await updateTransaction({
      transactionId: editTarget.transactionId,
      payload: {
        ...data,
        transactionType: data.transactionType as TransactionType,
        // backend never persists assetType on update (fixed per ticker) — pass through unchanged
        assetType: editTarget.assetType,
        currency: data.currency as Currency,
        quantity: parseFloat(data.quantity),
        price: parseFloat(data.price),
        commission: parseFloat(data.commission || '0'),
        // the backend field is a LocalDate: send the calendar day as typed. Going
        // through toISOString() shifts it a day back east of UTC (00:00 CEST is
        // 22:00Z the day before) and can be rejected outright as a LocalDate.
        date: data.date,
      },
    });
    setEditTarget(null);
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    await deleteTransaction(deleteTarget.transactionId);
    setDeleteTarget(null);
  };

  // Newest first — sort by date explicitly, backend order is not guaranteed
  const sorted = transactions
    ? [...transactions].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
    : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="text-[13px] text-slate-500 dark:text-slate-400">
          {isLoading ? 'Loading…' : `${sorted.length} transaction${sorted.length !== 1 ? 's' : ''} in ${selectedYear}`}
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          disabled={isLoading}
          className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-w-[90px]"
        >
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {error && <ErrorAlert title="Error loading transactions" message={(error as Error).message} />}

      {!error && !isLoading && sorted.length === 0 && (
        <EmptyState icon={ListFilter} title="No transactions" description={`No transactions found for ${selectedYear}.`} />
      )}

      {(isLoading || sorted.length > 0) && (
        <>
        {/* Under md the table collapses to cards — no horizontal scrolling */}
        <div className="space-y-2.5 md:hidden">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="h-[86px] animate-pulse rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
            ))
          ) : sorted.map((t) => {
            // Direction follows the mockup's ledger reading: cash in is a credit,
            // a position leaving the portfolio is a debit, tax is its own tone.
            const cashIn  = t.transactionType === 'DIVIDEND' || t.transactionType === 'DEPOSIT';
            const cashOut = t.transactionType === 'SELL' || t.transactionType === 'WITHDRAWAL';
            const tone = cashIn ? 'text-emerald-600 dark:text-emerald-400'
              : cashOut ? 'text-red-500 dark:text-red-400'
                : t.transactionType === 'TAX' ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white';
            const sign = cashIn ? '+' : cashOut ? '-' : '';
            return (
              <div key={t.transactionId} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <StockLogo ticker={t.ticker} assetType={t.assetType} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{t.ticker}</span>
                      <Badge type={t.transactionType} />
                    </div>
                    <div className="mt-0.5 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {formatDate(t.date)} · {t.quantity} @ {formatCurrency(t.price, 2, t.currency)}
                    </div>
                  </div>
                  <div className={`text-[14px] font-semibold tabular-nums ${tone}`}>
                    {t.totalAmount == null
                      ? formatCurrency(null)
                      : `${sign}${formatCurrency(Math.abs(t.totalAmount), 2, t.currency)}`}
                  </div>
                </div>
                <div className="mt-2 flex justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-700/50">
                  <button
                    onClick={() => openEdit(t)}
                    aria-label={`Edit ${t.ticker} transaction`}
                    className="rounded p-1.5 text-indigo-600 transition-colors hover:bg-slate-100 dark:text-indigo-400 dark:hover:bg-slate-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    aria-label={`Delete ${t.ticker} transaction`}
                    className="rounded p-1.5 text-red-500 transition-colors hover:bg-slate-100 dark:text-red-400 dark:hover:bg-slate-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden md:block">
          <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      {['Ticker', 'Qty', 'Price', 'Total', 'Comm.', 'Date', 'Type', ''].map((h) => (
                        <th key={h} className={`py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${h === 'Ticker' || h === 'Date' || h === 'Type' || h === '' ? 'text-left' : 'text-right'} first:pl-5 last:pr-5`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                    {isLoading ? (
                      <SkeletonRow cols={8} />
                    ) : (
                      sorted.map((t) => (
                        <tr key={t.transactionId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="whitespace-nowrap py-3.5 pl-5 pr-4 text-[13px]">
                            <div className="flex items-center gap-2.5">
                              <StockLogo ticker={t.ticker} assetType={t.assetType} size="sm" />
                              <span className="font-semibold text-slate-900 dark:text-white">{t.ticker}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">{t.quantity}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">{formatCurrency(t.price, 2, t.currency)}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">{formatCurrency(t.totalAmount, 2, t.currency)}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-[13px] text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">{formatCurrency(t.commission, 2, t.currency)}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-[13px] font-mono tabular-nums text-slate-500 dark:text-slate-400">{formatDate(t.date)}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-[13px]">
                            <Badge type={t.transactionType} />
                          </td>
                          <td className="whitespace-nowrap py-3.5 pl-4 pr-5 text-right">
                            <div className="flex justify-end gap-1 opacity-40 hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(t)}
                                className="p-1.5 rounded text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setDeleteTarget(t)}
                                className="p-1.5 rounded text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={Boolean(editTarget)} onClose={() => setEditTarget(null)} title="Edit Transaction">
        <form onSubmit={handleSubmit(onEdit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ticker</label>
              <input {...register('ticker')} className={inputClass} />
              {errors.ticker && <p className="mt-1 text-xs text-red-600">{errors.ticker.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input type="date" {...register('date')} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <select {...register('transactionType')} className={selectClass}>
              {(['BUY', 'SELL', 'TAX', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL'] as TransactionType[]).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qty</label>
              <input type="number" step="any" {...register('quantity')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price</label>
              <input type="number" step="any" {...register('price')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Comm.</label>
              <input type="number" step="any" {...register('commission')} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
            <select {...register('currency')} className={selectClass}>
              {(['USD', 'EUR', 'GBP', 'CHF', 'PLN', 'CZK'] as Currency[]).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditTarget(null)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={updating}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {updating ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Confirm Deletion" maxWidth="sm">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
          Are you sure you want to delete this transaction? This action cannot be undone.
        </p>
        {deleteTarget && (
          <div className="mt-3 mb-6 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-900 dark:text-white">{deleteTarget.ticker}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {' '}· {deleteTarget.transactionType} · {deleteTarget.quantity} shares @ {formatCurrency(deleteTarget.price, 2, deleteTarget.currency)} · {formatDate(deleteTarget.date)}
            </span>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
            Cancel
          </button>
          <button onClick={onDelete} disabled={deleting}
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
