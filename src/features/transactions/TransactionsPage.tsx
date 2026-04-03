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
import { formatDate } from '../../lib/formatters';
import type { Transaction, TransactionType, Currency } from '../../types/transaction';
import type { AssetType } from '../../types/holding';

const editSchema = z.object({
  ticker: z.string().min(1),
  transactionType: z.enum(['BUY', 'SELL', 'TAX', 'DIVIDEND']),
  assetType: z.enum(['STOCK', 'FIGURINE', 'COIN', 'FUND', 'CRYPTO']),
  quantity: z.string().min(1),
  price: z.string().min(1),
  commission: z.string(),
  date: z.string().min(1),
  currency: z.enum(['USD', 'EUR', 'GBP']),
});
type EditValues = z.infer<typeof editSchema>;

const selectClass = 'block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white';
const inputClass = 'block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export default function TransactionsPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId!;

  const currentYear = new Date().getFullYear();
  const cachedFirst = parseInt(localStorage.getItem('firstTradeYear') ?? String(currentYear), 10);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const { data: transactions, isLoading, error } = useTransactions(pid, selectedYear);
  const { data: firstTradeYear } = useFirstTradeYear(pid);
  const { mutateAsync: updateTransaction, isPending: updating } = useUpdateTransaction(pid, selectedYear);
  const { mutateAsync: deleteTransaction, isPending: deleting } = useDeleteTransaction(pid, selectedYear);

  const firstYear = firstTradeYear ?? cachedFirst;
  const yearOptions = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => firstYear + i);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
  });

  const openEdit = (t: Transaction) => {
    setEditTarget(t);
    reset({
      ticker: t.ticker,
      transactionType: t.transactionType,
      assetType: t.assetType,
      quantity: String(t.quantity),
      price: String(t.price),
      commission: String(t.commission ?? 0),
      date: new Date(t.date).toISOString().slice(0, 16),
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
        assetType: data.assetType as AssetType,
        currency: data.currency as Currency,
        quantity: parseFloat(data.quantity),
        price: parseFloat(data.price),
        commission: parseFloat(data.commission || '0'),
        date: new Date(data.date).toISOString(),
      },
    });
    setEditTarget(null);
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    await deleteTransaction(deleteTarget.transactionId);
    setDeleteTarget(null);
  };

  const reversed = transactions ? [...transactions].reverse() : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">All transactions for the selected year.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            disabled={isLoading}
            className={selectClass + ' min-w-[100px]'}
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {error && <ErrorAlert title="Error loading transactions" message={(error as Error).message} />}

      {!error && !isLoading && reversed.length === 0 && (
        <EmptyState icon={ListFilter} title="No transactions" description={`No transactions found for ${selectedYear}.`} />
      )}

      {(isLoading || reversed.length > 0) && (
        <div className="flow-root">
          <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-slate-300 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      {['Ticker', 'Qty', 'Price ($)', 'Total ($)', 'Comm. ($)', 'Date', 'Type', ''].map((h) => (
                        <th key={h} className={`py-3.5 px-3 text-${h === 'Ticker' || h === 'Date' || h === 'Type' || h === '' ? 'left' : 'right'} text-sm font-semibold text-slate-900 dark:text-slate-200 first:pl-6 last:pr-6`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {isLoading ? (
                      <SkeletonRow cols={8} />
                    ) : (
                      reversed.map((t) => (
                        <tr key={t.transactionId} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-slate-500">{t.ticker.substring(0, 2)}</span>
                              </div>
                              <span className="font-medium text-slate-900 dark:text-white">{t.ticker}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-slate-500">{t.quantity}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-slate-500">{t.price?.toFixed(2) ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-medium text-slate-900 dark:text-white">{t.totalAmount?.toFixed(2) ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-slate-500">{t.commission?.toFixed(2) ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{formatDate(t.date)}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <Badge type={t.transactionType} />
                          </td>
                          <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEdit(t)}
                                className="p-1.5 rounded-full text-indigo-600 hover:bg-slate-100">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteTarget(t)}
                                className="p-1.5 rounded-full text-red-500 hover:bg-slate-100">
                                <Trash2 className="h-4 w-4" />
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
      )}

      {/* Edit dialog */}
      <Dialog open={Boolean(editTarget)} onClose={() => setEditTarget(null)} title="Edit Transaction">
        <form onSubmit={handleSubmit(onEdit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ticker</label>
              <input {...register('ticker')} className={inputClass} />
              {errors.ticker && <p className="mt-1 text-xs text-red-600">{errors.ticker.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="datetime-local" {...register('date')} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select {...register('transactionType')} className={selectClass}>
                {(['BUY', 'SELL', 'TAX', 'DIVIDEND'] as TransactionType[]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Asset Class</label>
              <select {...register('assetType')} className={selectClass}>
                {(['STOCK', 'FIGURINE', 'COIN', 'FUND', 'CRYPTO'] as AssetType[]).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qty</label>
              <input type="number" step="any" {...register('quantity')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
              <input type="number" step="any" {...register('price')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comm.</label>
              <input type="number" step="any" {...register('commission')} className={inputClass} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditTarget(null)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
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
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete this transaction? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
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
