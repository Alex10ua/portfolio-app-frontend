import { useState } from 'react';
import Dialog from '../../components/ui/Dialog';
import Spinner from '../../components/ui/Spinner';
import { useMarketData } from '../../hooks/useMarketData';
import { useCustomAsset, useUpdateCustomAssetPrice } from '../../hooks/useCustomAssets';
import { formatCurrency } from '../../lib/formatters';
import type { Holding } from '../../types/holding';

interface HoldingDetailDialogProps {
  holding: Holding | null;
  open: boolean;
  onClose: () => void;
  portfolioId: string;
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{value ?? '—'}</span>
    </div>
  );
}

function StockDetail({ ticker }: { ticker: string }) {
  const { data, isLoading } = useMarketData(ticker);

  if (isLoading) {
    return <div className="flex justify-center py-6"><Spinner /></div>;
  }

  return (
    <div>
      <DetailRow label="Name" value={data?.name} />
      <DetailRow label="Price" value={formatCurrency(data?.price)} />
      <DetailRow label="Country" value={data?.country} />
      <DetailRow label="Sector" value={data?.sector} />
      <DetailRow label="Industry" value={data?.industry} />
    </div>
  );
}

function CustomAssetDetail({ portfolioId, ticker }: { portfolioId: string; ticker: string }) {
  const { data, isLoading } = useCustomAsset(portfolioId, ticker);
  const { mutateAsync: updatePrice, isPending } = useUpdateCustomAssetPrice(portfolioId);
  const [newPrice, setNewPrice] = useState('');
  const [saved, setSaved] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center py-6"><Spinner /></div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return;
    await updatePrice({ ticker, price });
    setNewPrice('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const recentHistory = data?.priceHistory?.slice(-5).reverse() ?? [];

  return (
    <div className="space-y-4">
      <div>
        <DetailRow label="Name" value={data?.name} />
        <DetailRow label="Type" value={data?.assetType} />
        <DetailRow label="Country" value={data?.country} />
        <DetailRow label="Currency" value={data?.currency} />
        <DetailRow label="Unit" value={data?.unit} />
        <DetailRow label="Current Price" value={formatCurrency(data?.priceNow)} />
      </div>

      {recentHistory.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Price History
          </p>
          <div className="rounded-md bg-slate-50 dark:bg-slate-800 overflow-hidden">
            {recentHistory.map((entry, i) => (
              <div
                key={i}
                className="flex justify-between px-3 py-1.5 text-xs border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <span className="text-slate-500 dark:text-slate-400">{entry.date}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(entry.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Update Price
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            step="any"
            min="0"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="New price..."
            className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isPending || !newPrice}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <Spinner size="sm" /> : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function HoldingDetailDialog({ holding, open, onClose, portfolioId }: HoldingDetailDialogProps) {
  if (!holding) return null;

  return (
    <Dialog open={open} onClose={onClose} title={holding.ticker} maxWidth="sm">
      {holding.assetType === 'STOCK' ? (
        <StockDetail ticker={holding.ticker} />
      ) : (
        <CustomAssetDetail portfolioId={portfolioId} ticker={holding.ticker} />
      )}
    </Dialog>
  );
}
