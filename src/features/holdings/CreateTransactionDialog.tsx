import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import Dialog from '../../components/ui/Dialog';
import CreateCustomAssetDialog from '../customAssets/CreateCustomAssetDialog';
import { useCustomAssets, useCreateCustomAsset } from '../../hooks/useCustomAssets';
import type { AssetType, Holding } from '../../types/holding';
import type { TransactionType, Currency, CreateTransactionPayload } from '../../types/transaction';

const schema = z.object({
  assetType: z.enum(['STOCK', 'FIGURINE', 'COIN', 'FUND', 'CRYPTO', 'CUSTOM', 'CASH']),
  transactionType: z.enum(['BUY', 'SELL', 'TAX', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL']),
  ticker: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  quantity: z.string().optional(),
  price: z.string().optional(),
  commission: z.string(),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  amount: z.string().optional(),
  name: z.string().optional(),
  priceNow: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type ExtendedAssetType = AssetType | 'CASH';

const transactionTypesByAsset: Record<ExtendedAssetType, TransactionType[]> = {
  STOCK: ['BUY', 'SELL', 'TAX', 'DIVIDEND'],
  FIGURINE: ['BUY', 'SELL'],
  COIN: ['BUY', 'SELL'],
  FUND: ['BUY', 'SELL', 'DIVIDEND'],
  CRYPTO: ['BUY', 'SELL'],
  CUSTOM: ['BUY', 'SELL'],
  CASH: ['DEPOSIT', 'WITHDRAWAL'],
};

const selectClass =
  'block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100';
const inputClass =
  'block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTransactionPayload) => void;
  isPending?: boolean;
  portfolioId: string;
}

export default function CreateTransactionDialog({ open, onClose, onSubmit, isPending, portfolioId }: Props) {
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormValues>({
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
      amount: '',
      name: '',
      priceNow: '',
    },
  });

  const assetType = watch('assetType') as ExtendedAssetType;
  const isCash = assetType === 'CASH';
  const availableTypes = transactionTypesByAsset[assetType] ?? ['BUY', 'SELL'];
  const showNameField = !isCash && assetType !== 'STOCK' && assetType !== 'CRYPTO' && assetType !== 'CUSTOM';
  const isCustom = assetType === 'CUSTOM';

  const { data: customAssets } = useCustomAssets(portfolioId);
  const { mutateAsync: createCustomAsset, isPending: creatingAsset } = useCreateCustomAsset(portfolioId);
  const [createAssetOpen, setCreateAssetOpen] = useState(false);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // When switching asset type, reset transaction type to first available
  useEffect(() => {
    setValue('transactionType', availableTypes[0]);
    if (isCash) {
      setValue('ticker', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetType]);

  // When switching to CUSTOM, pre-select first available custom asset
  useEffect(() => {
    if (isCustom && customAssets?.length) {
      setValue('ticker', customAssets[0].ticker);
    } else if (isCustom) {
      setValue('ticker', '');
    }
  }, [isCustom, customAssets, setValue]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFormSubmit = (data: FormValues) => {
    if (isCash) {
      const currency = data.currency as Currency;
      onSubmit({
        ticker: currency,
        transactionType: data.transactionType as TransactionType,
        quantity: 0,
        price: 0,
        commission: data.commission ? Number(data.commission) : 0,
        date: data.date,
        currency,
        amount: data.amount ? Number(data.amount) : 0,
      });
    } else {
      onSubmit({
        ticker: data.ticker ?? '',
        transactionType: data.transactionType as TransactionType,
        assetType: data.assetType as AssetType,
        quantity: data.quantity ?? '0',
        price: data.price ?? '0',
        commission: data.commission,
        date: data.date,
        currency: data.currency as Currency,
        name: data.name,
        priceNow: data.priceNow,
      });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} title="Create New Transaction" maxWidth="md">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asset Type</label>
              <select {...register('assetType')} className={selectClass}>
                {(['STOCK', 'CRYPTO', 'CUSTOM', 'FIGURINE', 'COIN', 'FUND', 'CASH'] as ExtendedAssetType[]).map((t) => (
                  <option key={t} value={t}>{t === 'CASH' ? 'Cash (Deposit/Withdrawal)' : t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transaction Type</label>
              <select {...register('transactionType')} className={selectClass}>
                {availableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Cash transaction form */}
          {isCash && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    {...register('amount')}
                    className={inputClass}
                    placeholder="500.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                  <select {...register('currency')} className={selectClass}>
                    {(['USD', 'EUR', 'GBP'] as Currency[]).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                <input type="date" {...register('date')} className={inputClass} />
              </div>
            </div>
          )}

          {/* Standard asset transaction form */}
          {!isCash && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isCustom ? 'Custom Asset *' : 'Ticker *'}
                  </label>
                  {isCustom ? (
                    <div className="flex gap-2">
                      <select {...register('ticker')} className={selectClass}>
                        {!customAssets?.length && (
                          <option value="">— No assets yet —</option>
                        )}
                        {customAssets?.map((a) => (
                          <option key={a.ticker} value={a.ticker}>{a.name} ({a.ticker})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setCreateAssetOpen(true)}
                        title="Create new custom asset"
                        className="shrink-0 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 p-2 text-slate-500 hover:text-indigo-600 hover:border-indigo-500 bg-white dark:bg-slate-800"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <input {...register('ticker')} className={inputClass} placeholder="AAPL" />
                  )}
                  {errors.ticker && <p className="mt-1 text-xs text-red-600">{errors.ticker.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input type="date" {...register('date')} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity *</label>
                  <input type="number" step="any" min="0" {...register('quantity')} className={inputClass} placeholder="10" />
                  {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price *</label>
                  <input type="number" step="any" min="0" {...register('price')} className={inputClass} placeholder="150.00" />
                  {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Commission</label>
                  <input type="number" step="any" min="0" {...register('commission')} className={inputClass} placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                <select {...register('currency')} className={selectClass}>
                  {(['USD', 'EUR', 'GBP'] as Currency[]).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {showNameField && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {assetType === 'FUND' ? 'Fund Name' : assetType === 'FIGURINE' ? 'Figurine Name' : 'Coin Name'}
                    </label>
                    <input {...register('name')} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price Now</label>
                    <input type="number" step="any" min="0" {...register('priceNow')} className={inputClass} />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {isPending ? 'Creating…' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Inline create-custom-asset dialog */}
      <CreateCustomAssetDialog
        open={createAssetOpen}
        onClose={() => setCreateAssetOpen(false)}
        onSubmit={async (payload) => {
          const created = await createCustomAsset(payload);
          setCreateAssetOpen(false);
          setValue('ticker', created.ticker);
        }}
        isPending={creatingAsset}
      />
    </>
  );
}

// Re-export type used by Holdings to satisfy TS
export type { Holding };
