import { useState } from 'react';
import { CloudUpload, File as FileIcon, Trash2, Eye } from 'lucide-react';
import Dialog from '../../components/ui/Dialog';
import Spinner from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { useImports, useSubmitImportBatch, useDeleteImport, useImportDetail } from '../../hooks/useImports';
import { parseTransactionFile } from '../../lib/parseTransactionFile';
import type { CreateTransactionPayload } from '../../types/transaction';
import type { AssetType } from '../../types/holding';

interface Props {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
}

type View = 'drop' | 'preview';

interface ParsedPreview {
  filename: string;
  rows: CreateTransactionPayload[];
}

const selectClass = 'block rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100';

const ASSET_TYPES: AssetType[] = ['STOCK', 'CRYPTO', 'FUND', 'COIN', 'FIGURINE'];

export default function ImportTransactionsModal({ open, onClose, portfolioId }: Props) {
  const [view, setView] = useState<View>('drop');
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [assetType, setAssetType] = useState<AssetType>('STOCK');
  const [detailImportId, setDetailImportId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: imports = [], error: importsError } = useImports(portfolioId, open);
  const { mutateAsync: submitBatch, isPending: submitting } = useSubmitImportBatch(portfolioId);
  const { mutateAsync: deleteImport } = useDeleteImport(portfolioId);
  const { data: detailData } = useImportDetail(portfolioId, detailImportId);

  async function handleFile(file: File) {
    setParseError(null);
    try {
      const rows = await parseTransactionFile(file);
      setPreview({ filename: file.name, rows });
      setAssetType('STOCK');
      setView('preview');
    } catch (e) {
      setParseError((e as Error).message);
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!preview) return;
    const rows = preview.rows.map((r) => ({ ...r, assetType }));
    await submitBatch({ filename: preview.filename, transactions: rows });
    setPreview(null);
    setView('drop');
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setView('drop');
  };

  const handleClose = () => {
    setView('drop');
    setPreview(null);
    setParseError(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} title="Import Transactions" maxWidth="lg">
        {view === 'drop' && (
          <div className="space-y-5">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative block w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              <CloudUpload className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
              <span className="mt-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Drag and drop a transactions file here
              </span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">or click below to select a file (.csv, .xlsx)</span>
              <input id="file-input-modal" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
              <label htmlFor="file-input-modal">
                <span className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 cursor-pointer">
                  Choose File
                </span>
              </label>
              {parseError && (
                <div className="mt-3">
                  <ErrorAlert message={parseError} />
                </div>
              )}
            </div>

            {/* Import history */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Import History</h3>
              {importsError && <ErrorAlert message={(importsError as Error).message} />}
              <div className="overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md max-h-56 overflow-y-auto">
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {imports.length === 0 && (
                    <li className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">No import history found.</li>
                  )}
                  {imports.map((imp) => (
                    <li key={imp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileIcon className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-indigo-600 dark:text-indigo-400">{imp.filename ?? imp.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {imp.uploadedAt && new Date(imp.uploadedAt).toLocaleString()}
                              {imp.transactionCount != null && ` · ${imp.transactionCount} transactions`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setDetailImportId(imp.id); setDetailOpen(true); }}
                            className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => setConfirmDeleteId(imp.id)}
                            className="rounded-full p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={handleClose} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">
                Close
              </button>
            </div>
          </div>
        )}

        {view === 'preview' && preview && (
          <div className="space-y-4">
            {/* Preview header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-900 dark:text-slate-100">{preview.filename}</span>
                {' — '}{preview.rows.length} transaction{preview.rows.length !== 1 ? 's' : ''} detected
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">Asset type</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as AssetType)}
                  className={selectClass}
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview table */}
            <div className="overflow-auto max-h-80 rounded-md border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr>
                    {['Ticker', 'Type', 'Qty', 'Price', 'Commission', 'Currency', 'Date'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{row.ticker}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.transactionType === 'BUY'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }`}>
                          {row.transactionType}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{Number(row.quantity).toFixed(4).replace(/\.?0+$/, '')}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{Number(row.price).toFixed(2)}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{Number(row.commission).toFixed(2)}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.currency}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={handleCancelPreview}
                disabled={submitting}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleConfirmImport()}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {submitting && <Spinner size="sm" className="text-white" />}
                Import {preview.rows.length} transaction{preview.rows.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onClose={() => { setDetailOpen(false); setDetailImportId(null); }} title="Import Detail" maxWidth="lg">
        {!detailData ? (
          <div className="flex justify-center p-8"><Spinner /></div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
              {detailData.batch?.filename ?? detailData.filename ?? detailData.name}
            </p>
            {detailData.transactions?.length ? (
              <div className="overflow-auto max-h-80 rounded-md border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                    <tr>
                      {['Ticker', 'Type', 'Qty', 'Price', 'Commission', 'Currency', 'Date'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {detailData.transactions.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{t.ticker}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            t.transactionType === 'BUY'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                              : t.transactionType === 'SELL'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {t.transactionType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{t.quantity}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{t.price}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{t.commission ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{t.currency}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{t.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No transactions available.</p>
            )}
          </div>
        )}
      </Dialog>
      {/* Confirm delete dialog */}
      <Dialog open={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)} title="Delete Import Batch" maxWidth="sm">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          This will permanently delete the import batch and all its transactions. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (confirmDeleteId) void deleteImport(confirmDeleteId);
              setConfirmDeleteId(null);
            }}
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </Dialog>
    </>
  );
}
