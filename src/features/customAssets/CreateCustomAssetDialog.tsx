import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import Dialog from '../../components/ui/Dialog';
import type { CreateCustomAssetPayload } from '../../types/customAsset';

const schema = z.object({
  ticker: z.string().min(1, 'Ticker / ID is required'),
  name: z.string().min(1, 'Name is required'),
  assetType: z.string().min(1, 'Asset type is required'),
  description: z.string().optional(),
  country: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'PLN', 'UAH']),
  unit: z.string().min(1, 'Unit is required'),
  priceNow: z.string().optional(),
  priceUpdateMethod: z.enum(['MANUAL', 'EXTERNAL']),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  'block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500';
const selectClass =
  'block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateCustomAssetPayload) => void;
  isPending?: boolean;
}

export default function CreateCustomAssetDialog({ open, onClose, onSubmit, isPending }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ticker: '',
      name: '',
      assetType: '',
      description: '',
      country: '',
      currency: 'USD',
      unit: 'pcs',
      priceNow: '',
      priceUpdateMethod: 'MANUAL',
    },
  });

  // Custom metadata fields (key-value pairs)
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    if (!open) {
      reset();
      setCustomFields([]);
    }
  }, [open, reset]);

  const addField = () => setCustomFields((f) => [...f, { key: '', value: '' }]);
  const removeField = (i: number) => setCustomFields((f) => f.filter((_, idx) => idx !== i));
  const updateField = (i: number, part: 'key' | 'value', val: string) =>
    setCustomFields((f) => f.map((entry, idx) => (idx === i ? { ...entry, [part]: val } : entry)));

  const onFormSubmit = (data: FormValues) => {
    const fields: Record<string, string> = {};
    for (const { key, value } of customFields) {
      if (key.trim()) fields[key.trim()] = value;
    }
    onSubmit({
      ...data,
      priceNow: data.priceNow ? Number(data.priceNow) : undefined,
      customFields: fields,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create Custom Asset" maxWidth="lg">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ticker / ID *</label>
            <input {...register('ticker')} className={inputClass} placeholder="SILV-EAGLE-1OZ" />
            {errors.ticker && <p className="mt-1 text-xs text-red-600">{errors.ticker.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
            <input {...register('name')} className={inputClass} placeholder="Silver Eagle 1oz" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asset Type *</label>
            <input {...register('assetType')} className={inputClass} placeholder="e.g. COIN, FIGURE, WINE" />
            {errors.assetType && <p className="mt-1 text-xs text-red-600">{errors.assetType.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit *</label>
            <input {...register('unit')} className={inputClass} placeholder="pcs / oz / bottle" />
            {errors.unit && <p className="mt-1 text-xs text-red-600">{errors.unit.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Price</label>
            <input type="number" step="any" min="0" {...register('priceNow')} className={inputClass} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
            <select {...register('currency')} className={selectClass}>
              {(['USD', 'EUR', 'GBP', 'PLN', 'UAH'] as const).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price Updates</label>
            <select {...register('priceUpdateMethod')} className={selectClass}>
              <option value="MANUAL">Manual</option>
              <option value="EXTERNAL">External</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
            <input {...register('country')} className={inputClass} placeholder="USA" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <input {...register('description')} className={inputClass} placeholder="Optional notes" />
          </div>
        </div>

        {/* Custom metadata fields */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Custom Fields</label>
            <button type="button" onClick={addField}
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200">
              <Plus className="h-3 w-3" /> Add Field
            </button>
          </div>
          {customFields.map((field, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                value={field.key}
                onChange={(e) => updateField(i, 'key', e.target.value)}
                className={inputClass}
                placeholder="Field name (e.g. Grade)"
              />
              <input
                value={field.value}
                onChange={(e) => updateField(i, 'value', e.target.value)}
                className={inputClass}
                placeholder="Value (e.g. MS70)"
              />
              <button type="button" onClick={() => removeField(i)}
                className="p-2 text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {isPending ? 'Creating…' : 'Create Asset'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
