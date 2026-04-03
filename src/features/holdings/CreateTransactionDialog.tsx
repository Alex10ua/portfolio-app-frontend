import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Dialog from '../../components/ui/Dialog';
import type { AssetType, Holding } from '../../types/holding';
import type { TransactionType, Currency, CreateTransactionPayload } from '../../types/transaction';

const schema = z.object({
  assetType: z.enum(['STOCK', 'FIGURINE', 'COIN', 'FUND', 'CRYPTO']),
  transactionType: z.enum(['BUY', 'SELL', 'TAX', 'DIVIDEND']),
  ticker: z.string().min(1, 'Ticker is required'),
  date: z.string().min(1, 'Date is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  price: z.string().min(1, 'Price is required'),
  commission: z.string(),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  name: z.string().optional(),
  priceNow: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const transactionTypesByAsset: Record<AssetType, TransactionType[]> = {
  STOCK: ['BUY', 'SELL', 'TAX', 'DIVIDEND'],
  FIGURINE: ['BUY', 'SELL'],
  COIN: ['BUY', 'SELL'],
  FUND: ['BUY', 'SELL', 'DIVIDEND'],
  CRYPTO: ['BUY', 'SELL'],
};

const selectClass = 'block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white';
const inputClass = 'block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTransactionPayload) => void;
  isPending?: boolean;
}

export default function CreateTransactionDialog({ open, onClose, onSubmit, isPending }: Props) {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetType: 'STOCK',
      transactionType: 'BUY',
      ticker: '',
      date: new Date().toISOString().split('T')[0],
      quantity: '',
      price: '',
      commission: '',
      currency: 'USD',
      name: '',
      priceNow: '',
    },
  });

  const assetType = watch('assetType') as AssetType;
  const availableTypes = transactionTypesByAsset[assetType] ?? ['BUY', 'SELL'];
  const showNameField = assetType !== 'STOCK' && assetType !== 'CRYPTO';

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFormSubmit = (data: FormValues) => {
    onSubmit({
      ...data,
      transactionType: data.transactionType as TransactionType,
      assetType: data.assetType as AssetType,
      currency: data.currency as Currency,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Create New Transaction" maxWidth="md">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Asset Type</label>
            <select {...register('assetType')} className={selectClass}>
              {(['STOCK', 'FIGURINE', 'COIN', 'FUND', 'CRYPTO'] as AssetType[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Type</label>
            <select {...register('transactionType')} className={selectClass}>
              {availableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ticker *</label>
            <input {...register('ticker')} className={inputClass} placeholder="AAPL" />
            {errors.ticker && <p className="mt-1 text-xs text-red-600">{errors.ticker.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
            <input type="date" {...register('date')} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
            <input type="number" step="any" min="0" {...register('quantity')} className={inputClass} placeholder="10" />
            {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price *</label>
            <input type="number" step="any" min="0" {...register('price')} className={inputClass} placeholder="150.00" />
            {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Commission</label>
            <input type="number" step="any" min="0" {...register('commission')} className={inputClass} placeholder="0.00" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
          <select {...register('currency')} className={selectClass}>
            {(['USD', 'EUR', 'GBP'] as Currency[]).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {showNameField && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {assetType === 'FUND' ? 'Fund Name' : assetType === 'FIGURINE' ? 'Figurine Name' : 'Coin Name'}
              </label>
              <input {...register('name')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price Now</label>
              <input type="number" step="any" min="0" {...register('priceNow')} className={inputClass} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {isPending ? 'Creating…' : 'Create Transaction'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// Re-export type used by Holdings to satisfy TS
export type { Holding };
