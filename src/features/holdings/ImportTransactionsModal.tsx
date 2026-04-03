import { useState } from 'react';
import { CloudUpload, File as FileIcon, Trash2, Eye } from 'lucide-react';
import Dialog from '../../components/ui/Dialog';
import Spinner from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { useImports, useUploadImport, useDeleteImport, useImportDetail } from '../../hooks/useImports';

interface Props {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
}

export default function ImportTransactionsModal({ open, onClose, portfolioId }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [detailImportId, setDetailImportId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: imports = [], error: importsError } = useImports(portfolioId, open);
  const { mutateAsync: uploadImport, isPending: uploading } = useUploadImport(portfolioId);
  const { mutateAsync: deleteImport } = useDeleteImport(portfolioId);
  const { data: detailData } = useImportDetail(portfolioId, detailImportId);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadImport(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadImport(file);
  };

  const handleView = (id: number) => {
    setDetailImportId(id);
    setDetailOpen(true);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Import Transactions" maxWidth="lg">
        <div className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative block w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <CloudUpload className="mx-auto h-10 w-10 text-slate-400" strokeWidth={1.5} />
            <span className="mt-2 block text-sm font-semibold text-slate-900">
              Drag and drop a transactions file here
            </span>
            <span className="mt-1 block text-xs text-slate-500">or click below to select a file (.csv, .xlsx)</span>
            <input id="file-input-modal" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
            <label htmlFor="file-input-modal">
              <span className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 cursor-pointer">
                Choose File
              </span>
            </label>
            {uploading && <div className="mt-4 flex justify-center"><Spinner size="sm" /></div>}
          </div>

          {/* Import history */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Import History</h3>
            {importsError && <ErrorAlert message={(importsError as Error).message} />}
            <div className="overflow-hidden bg-white border border-slate-200 rounded-md max-h-56 overflow-y-auto">
              <ul className="divide-y divide-slate-200">
                {imports.length === 0 && (
                  <li className="px-4 py-4 text-center text-sm text-slate-500">No import history found.</li>
                )}
                {imports.map((imp) => (
                  <li key={imp.id} className="hover:bg-slate-50">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileIcon className="h-5 w-5 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-indigo-600">{imp.filename ?? imp.name}</p>
                          {imp.uploadedAt && (
                            <p className="text-xs text-slate-500">{new Date(imp.uploadedAt).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleView(imp.id)}
                          className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => void deleteImport(imp.id)}
                          className="rounded-full p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100">
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
            <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onClose={() => { setDetailOpen(false); setDetailImportId(null); }} title="Import Detail">
        {!detailData ? (
          <div className="flex justify-center p-8"><Spinner /></div>
        ) : (
          <div>
            <p className="text-sm font-medium text-slate-500 mb-3">{detailData.filename ?? detailData.name}</p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {detailData.transactions?.length ? (
                detailData.transactions.map((t, i) => (
                  <pre key={i} className="bg-slate-50 p-2 rounded text-xs border border-slate-200 overflow-x-auto">
                    {JSON.stringify(t, null, 2)}
                  </pre>
                ))
              ) : (
                <p className="text-sm text-slate-500">No transactions available.</p>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
