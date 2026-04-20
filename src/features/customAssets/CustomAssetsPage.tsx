import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, RefreshCw, Clock } from 'lucide-react';
import {
  useCustomAssets,
  useCreateCustomAsset,
  useDeleteCustomAsset,
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
  const navigate = useNavigate();
  const pid = portfolioId!;

  const { data: assets, isLoading, error } = useCustomAssets(pid);
  const { mutateAsync: create, isPending: creating } = useCreateCustomAsset(pid);
  const { mutateAsync: remove } = useDeleteCustomAsset(pid);
  const { mutateAsync: updatePrice, isPending: updatingPrice } = useUpdateCustomAssetPrice(pid);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomAsset | null>(null);
  const [priceTarget, setPriceTarget] = useState<CustomAsset | null>(null);
  const [newPrice, setNewPrice] = useState('');

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading custom assets" message={(error as Error).message} />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button onClick={() => navigate(`/${pid}`)}
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-2 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Holdings
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Custom Assets</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your custom asset definitions (coins, figures, collectibles, etc.)
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
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
              className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{asset.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{asset.ticker}</p>
                </div>
                <span className="shrink-0 inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-600/20">
                  {asset.assetType}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {asset.priceNow != null ? formatCurrency(asset.priceNow) : '—'}
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

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setPriceTarget(asset);
                    setNewPrice(String(asset.priceNow ?? ''));
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Update Price
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
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPriceTarget(null)}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button
              disabled={!newPrice || updatingPrice}
              onClick={async () => {
                if (!priceTarget || !newPrice) return;
                await updatePrice({ ticker: priceTarget.ticker, price: Number(newPrice) });
                setPriceTarget(null);
                setNewPrice('');
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
