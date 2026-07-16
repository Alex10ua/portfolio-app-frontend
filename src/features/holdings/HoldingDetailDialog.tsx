import { useState } from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import Dialog from '../../components/ui/Dialog';
import Spinner from '../../components/ui/Spinner';
import TagEditor from '../../components/ui/TagEditor';
import NoteEditor from '../../components/ui/NoteEditor';
import { useMarketData } from '../../hooks/useMarketData';
import { useCustomAsset, useUpdateCustomAssetPrice } from '../../hooks/useCustomAssets';
import { useCreateTransaction } from '../../hooks/useHoldings';
import { formatCurrency } from '../../lib/formatters';
import type { Holding } from '../../types/holding';
import type { Currency } from '../../types/transaction';

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
  const today = new Date().toISOString().slice(0, 10);
  const [newPrice, setNewPrice] = useState('');
  const [priceDate, setPriceDate] = useState(today);
  const [saved, setSaved] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center py-6"><Spinner /></div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0 || !priceDate) return;
    await updatePrice({ ticker, price, date: priceDate });
    setNewPrice('');
    setPriceDate(today);
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
        <DetailRow label="Current Price" value={formatCurrency(data?.priceNow, undefined, data?.currency || 'USD')} />
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
                <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(entry.price, undefined, data?.currency || 'USD')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Update Price
        </p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="New price..."
              className="flex-1 min-w-0 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={priceDate}
              max={today}
              onChange={(e) => setPriceDate(e.target.value)}
              className="w-[150px] shrink-0 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !newPrice || !priceDate}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <Spinner size="sm" /> : saved ? 'Saved!' : 'Save'}
          </button>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            Past date updates price history only; today also updates the current price.
          </p>
        </div>
      </form>
    </div>
  );
}

function ClosePositionSection({ holding, portfolioId, onClosed }: {
  holding: Holding;
  portfolioId: string;
  onClosed: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [confirming, setConfirming] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: createTransaction, isPending } = useCreateTransaction(portfolioId);

  const currency = holding.currency ?? 'USD';
  const priceNum = Number(sellPrice);
  const priceValid = sellPrice !== '' && Number.isFinite(priceNum) && priceNum >= 0;
  const total = priceValid ? priceNum * holding.shareAmount : null;

  const openConfirm = () => {
    // prefill with the current market price; user can override
    setSellPrice(holding.currentShareValue != null ? String(holding.currentShareValue) : '');
    setSellDate(today);
    setError(null);
    setConfirming(true);
  };

  const closePosition = async () => {
    if (!priceValid || !sellDate) return;
    setError(null);
    try {
      await createTransaction({
        ticker: holding.ticker,
        transactionType: 'SELL',
        assetType: holding.assetType ?? undefined,
        quantity: holding.shareAmount,
        price: priceNum,
        commission: 0,
        date: sellDate,
        currency: currency as Currency,
        name: holding.name ?? undefined,
      });
      onClosed();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
      {!confirming ? (
        <button
          type="button"
          onClick={openConfirm}
          disabled={holding.shareAmount <= 0}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-red-200 dark:border-red-800 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Close Position
        </button>
      ) : (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Sell <strong>all {holding.shareAmount}</strong> {holding.shareAmount === 1 ? 'share' : 'shares'} of{' '}
              <strong>{holding.ticker}</strong>
              {total != null && <> for ≈ <strong>{formatCurrency(total, undefined, currency)}</strong></>}?
              A SELL transaction will be created and the position will disappear from the table.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-semibold text-red-700 dark:text-red-300 mb-1">
                Sell price ({currency})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                autoFocus
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="w-[150px] shrink-0">
              <label className="block text-[11px] font-semibold text-red-700 dark:text-red-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={sellDate}
                max={today}
                onChange={(e) => setSellDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void closePosition()}
              disabled={isPending || !priceValid || !sellDate}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Closing…' : 'Sell All & Close'}
            </button>
          </div>
        </div>
      )}
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
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Notes
        </p>
        <NoteEditor portfolioId={portfolioId} ticker={holding.ticker} />
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Tags
        </p>
        <TagEditor portfolioId={portfolioId} ticker={holding.ticker} />
      </div>
      <ClosePositionSection holding={holding} portfolioId={portfolioId} onClosed={onClose} />
    </Dialog>
  );
}
