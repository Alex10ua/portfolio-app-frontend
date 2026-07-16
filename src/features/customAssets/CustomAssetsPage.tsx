import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, RefreshCw, Clock, Pencil } from 'lucide-react';
import {
  useCustomAssets,
  useCreateCustomAsset,
  useDeleteCustomAsset,
  useUpdateCustomAsset,
  useUpdateCustomAssetPrice,
} from '../../hooks/useCustomAssets';
import CreateCustomAssetDialog from './CreateCustomAssetDialog';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import Dialog from '../../components/ui/Dialog';
import { formatCurrency } from '../../lib/formatters';
import type { CustomAsset } from '../../types/customAsset';

export default function CustomAssetsPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId!;

  const { data: assets, isLoading, error } = useCustomAssets(pid);
  const { mutateAsync: create, isPending: creating } = useCreateCustomAsset(pid);
  const { mutateAsync: remove } = useDeleteCustomAsset(pid);
  const { mutateAsync: updatePrice, isPending: updatingPrice } = useUpdateCustomAssetPrice(pid);
  const { mutateAsync: updateAsset, isPending: updatingAsset } = useUpdateCustomAsset(pid);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomAsset | null>(null);
  const [priceTarget, setPriceTarget] = useState<CustomAsset | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [priceDate, setPriceDate] = useState(today);
  // Edit dialog — every field editable except ticker (it's the FK to transactions/holdings)
  const [editTarget, setEditTarget] = useState<CustomAsset | null>(null);
  const [editForm, setEditForm] = useState({ name: '', assetType: '', description: '', country: '', currency: '', unit: '' });

  const openEdit = (asset: CustomAsset) => {
    setEditForm({
      name: asset.name ?? '',
      assetType: asset.assetType ?? '',
      description: asset.description ?? '',
      country: asset.country ?? '',
      currency: asset.currency ?? '',
      unit: asset.unit ?? '',
    });
    setEditTarget(asset);
  };

  const submitEdit = async () => {
    if (!editTarget || !editForm.name.trim() || !editForm.currency.trim()) return;
    await updateAsset({
      ticker: editTarget.ticker,
      payload: {
        name: editForm.name.trim(),
        assetType: editForm.assetType.trim() || undefined,
        description: editForm.description,
        country: editForm.country,
        currency: editForm.currency.trim().toUpperCase(),
        unit: editForm.unit.trim() || undefined,
      },
    });
    setEditTarget(null);
  };


  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading custom assets" message={(error as Error).message} />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-end">
        <button onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors">
          <Plus className="h-4 w-4" />
          New Custom Asset
        </button>
      </div>

      {/* Assets list */}
      {!assets?.length ? (
        <EmptyState
          icon={Plus}
          title="No custom assets yet"
          description="Create a custom asset (coin, figure, etc.) to use in your transactions."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <div key={asset.ticker}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p title={asset.name} className="font-semibold text-slate-900 dark:text-white truncate">{asset.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{asset.ticker}</p>
                </div>
                <span className="shrink-0 inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-600/20">
                  {asset.assetType}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {asset.priceNow != null ? formatCurrency(asset.priceNow, undefined, asset.currency || 'USD') : '—'}
                </span>
                <span className="text-xs text-slate-400">{asset.currency} / {asset.unit}</span>
              </div>

              {asset.country && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{asset.country}</p>
              )}

              {Object.keys(asset.customFields ?? {}).length > 0 && (
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                  {Object.entries(asset.customFields).map(([k, v]) => (
                    <div key={k} className="flex gap-1">
                      <span className="font-medium">{k}:</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {asset.priceHistory?.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <Clock className="h-3 w-3" />
                  {asset.priceHistory.length} price update{asset.priceHistory.length !== 1 ? 's' : ''}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => {
                    setPriceTarget(asset);
                    setNewPrice(String(asset.priceNow ?? ''));
                    setPriceDate(today);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Update Price
                </button>
                <button
                  onClick={() => openEdit(asset)}
                  title="Edit asset"
                  className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setDeleteTarget(asset)}
                  className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateCustomAssetDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          await create(payload);
          setCreateOpen(false);
        }}
        isPending={creating}
      />

      {/* Edit asset dialog — everything except ticker */}
      <Dialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={`Edit Asset — ${editTarget?.ticker ?? ''}`}
      >
        <form onSubmit={(e) => { e.preventDefault(); void submitEdit(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ticker</label>
            <input
              value={editTarget?.ticker ?? ''}
              disabled
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Ticker cannot change — transactions and holdings reference it.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                autoFocus
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <input
                value={editForm.assetType}
                onChange={(e) => setEditForm({ ...editForm, assetType: e.target.value })}
                placeholder="e.g. COIN, SKIN, WINE"
                className="block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
              <input
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                className="block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
              <input
                required
                maxLength={3}
                pattern="[A-Za-z]{3}"
                value={editForm.currency}
                onChange={(e) => setEditForm({ ...editForm, currency: e.target.value.toUpperCase() })}
                className="block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit</label>
              <input
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                placeholder="pcs, oz, bottle…"
                className="block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditTarget(null)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingAsset || !editForm.name.trim() || !/^[A-Z]{3}$/.test(editForm.currency)}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {updatingAsset ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Update price dialog */}
      <Dialog
        open={Boolean(priceTarget)}
        onClose={() => setPriceTarget(null)}
        title={`Update Price — ${priceTarget?.name ?? ''}`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Price ({priceTarget?.currency})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Price Date
            </label>
            <input
              type="date"
              value={priceDate}
              max={today}
              onChange={(e) => setPriceDate(e.target.value)}
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              Past date updates price history only; today also updates the current price.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPriceTarget(null)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button
              disabled={!newPrice || !priceDate || updatingPrice}
              onClick={async () => {
                if (!priceTarget || !newPrice) return;
                await updatePrice({ ticker: priceTarget.ticker, price: Number(newPrice), date: priceDate });
                setPriceTarget(null);
                setNewPrice('');
                setPriceDate(today);
              }}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {updatingPrice ? 'Saving…' : 'Save Price'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Custom Asset"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.ticker})? This will not delete existing transactions or holdings.
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDeleteTarget(null)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!deleteTarget) return;
                await remove(deleteTarget.ticker);
                setDeleteTarget(null);
              }}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
