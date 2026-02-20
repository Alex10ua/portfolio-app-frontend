import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/api';
import {
    CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    ArrowBack as ArrowBackIcon,
    InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'; // Keeping Dialog for simplicity or replace with custom modal

function ImportTransactions() {
    const { portfolioId } = useParams();
    const navigate = useNavigate();

    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imports, setImports] = useState([]);
    const [error, setError] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailData, setDetailData] = useState(null);

    const fetchImports = useCallback(() => {
        apiClient
            .get(`${portfolioId}/imports`)
            .then((res) => setImports(res.data || []))
            .catch((err) => {
                console.error('Error fetching imports', err);
                setError(err);
            });
    }, [portfolioId]);

    useEffect(() => {
        fetchImports();
    }, [fetchImports]);

    const handleDeleteImport = async (importId) => {
        try {
            await apiClient.delete(`${portfolioId}/imports/${importId}`);
            fetchImports();
        } catch (err) {
            console.error('Delete failed', err);
            setError(err);
        }
    };

    const handleViewImport = async (importId) => {
        try {
            const res = await apiClient.get(`${portfolioId}/imports/${importId}`);
            setDetailData(res.data);
            setDetailOpen(true);
        } catch (err) {
            console.error('Fetch import detail failed', err);
            setError(err);
        }
    };

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);
        try {
            await apiClient.post(`${portfolioId}/imports`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            fetchImports();
        } catch (err) {
            console.error('Upload failed', err);
            setError(err);
        } finally {
            setUploading(false);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            uploadFile(files[0]);
        }
    };

    const onInputChange = (e) => {
        const files = e.target.files;
        if (files && files[0]) uploadFile(files[0]);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate(`/${portfolioId}`)}
                className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700"
            >
                <ArrowBackIcon className="mr-1 h-4 w-4" />
                Back to Holdings
            </button>

            <h1 className="text-2xl font-bold text-slate-900 mb-6">Import Transactions</h1>

            {/* Upload Area */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`
                    relative block w-full rounded-lg border-2 border-dashed p-12 text-center hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                    ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'}
                `}
            >
                <CloudUploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                <span className="mt-2 block text-sm font-semibold text-slate-900">
                    Drag and drop a transactions file here
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                    or click below to select a file
                </span>

                <input
                    id="file-input"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={onInputChange}
                    className="hidden"
                />
                <label htmlFor="file-input">
                    <span className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 cursor-pointer">
                        Choose File
                    </span>
                </label>
                {uploading && (
                    <div className="mt-4 flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                )}
            </div>

            <h2 className="text-lg font-medium text-slate-900 mt-8 mb-4">Import History</h2>

            {error && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error.message}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-hidden bg-white shadow sm:rounded-md">
                <ul className="divide-y divide-slate-200">
                    {imports.length === 0 && (
                        <li className="px-4 py-4 sm:px-6 text-center text-slate-500 text-sm">
                            No import history found.
                        </li>
                    )}
                    {imports.map((imp) => (
                        <li key={imp.id || imp.filename}>
                            <div className="block hover:bg-slate-50">
                                <div className="flex items-center px-4 py-4 sm:px-6">
                                    <div className="min-w-0 flex-1 flex items-center">
                                        <div className="flex-shrink-0">
                                            <FileIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
                                        </div>
                                        <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                                            <div>
                                                <p className="truncate text-sm font-medium text-indigo-600">{imp.filename || imp.name}</p>
                                                <p className="mt-2 flex items-center text-sm text-slate-500">
                                                    {/* Additional info if needed */}
                                                </p>
                                            </div>
                                            <div className="hidden md:block">
                                                <div>
                                                    <p className="text-sm text-slate-900">
                                                        Uploaded on <time dateTime={imp.uploadedAt}>{imp.uploadedAt ? new Date(imp.uploadedAt).toLocaleString() : 'Unknown date'}</time>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewImport(imp.id)}
                                            className="rounded-full p-1 text-slate-400 hover:text-slate-500 hover:bg-slate-100"
                                            title="View Details"
                                        >
                                            <VisibilityIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteImport(imp.id)}
                                            className="rounded-full p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100"
                                            title="Delete Import"
                                        >
                                            <DeleteIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Detail Dialog - Keeping MUI Dialog for now as it handles modal logic well, but styled content */}
            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
                <DialogTitle className="font-bold border-b border-slate-200">Imported Transactions</DialogTitle>
                <DialogContent>
                    {!detailData && (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}
                    {detailData && (
                        <div className="mt-4">
                            <p className="text-sm font-medium text-slate-500 mb-2">File: {detailData.filename || detailData.name}</p>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {Array.isArray(detailData.transactions) && detailData.transactions.length > 0 ? (
                                    detailData.transactions.map((t, i) => (
                                        <div key={i} className="bg-slate-50 p-3 rounded text-xs font-mono border border-slate-200">
                                            {JSON.stringify(t, null, 2)}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500">No transactions available for this import.</p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions className="border-t border-slate-200 pt-3">
                    <Button onClick={() => setDetailOpen(false)} className="text-indigo-600">Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default ImportTransactions;
