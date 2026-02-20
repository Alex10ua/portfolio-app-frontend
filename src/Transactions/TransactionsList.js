import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
    TextField,
    Stack,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';

import apiClient from '../api/api';

const TransactionsList = () => {
    const { portfolioId } = useParams();

    const defaultCurrentYear = new Date().getFullYear();
    const cachedFirstTradeYear = parseInt(localStorage.getItem('firstTradeYear') || defaultCurrentYear.toString(), 10);

    const [selectedYear, setSelectedYear] = useState(defaultCurrentYear);
    const [transactions, setTransactions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Dialog and form state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [editFormData, setEditFormData] = useState(null);

    // In-memory cache
    const transactionCache = useRef({});

    const fetchTransactionList = useCallback((yearToFetch) => {
        setLoading(true);
        setError(null);

        if (transactionCache.current[yearToFetch]) {
            setTransactions(transactionCache.current[yearToFetch]);
            setLoading(false);
            setError(null);
            return;
        }

        apiClient.get(`${portfolioId}/transactions/${yearToFetch}`)
            .then(response => {
                const data = response.data || [];
                transactionCache.current[yearToFetch] = data;
                setTransactions(data);
                setLoading(false);
            })
            .catch(error => {
                console.error(`Error fetching transactions for year ${yearToFetch}:`, error);
                setError(error);
                setTransactions(null);
                setLoading(false);
            });
    }, [portfolioId]);

    useEffect(() => {
        fetchTransactionList(selectedYear);
    }, [selectedYear, fetchTransactionList]);

    const handleYearChange = (event) => {
        const newYear = parseInt(event.target.value, 10);
        setSelectedYear(newYear);
    };

    // --- Edit Handlers ---
    const handleEditClick = (transaction) => {
        setSelectedTransaction(transaction);
        setEditFormData({
            ticker: transaction.ticker,
            transactionType: transaction.transactionType,
            quantity: transaction.quantity,
            price: transaction.price,
            commission: transaction.commission,
            date: new Date(transaction.date).toISOString().slice(0, 16),
            assetType: transaction.assetType,
            currency: transaction.currency
        });
        setEditDialogOpen(true);
    };

    const handleEditClose = () => {
        setEditDialogOpen(false);
        setSelectedTransaction(null);
        setEditFormData(null);
    };

    const handleEditFormChange = (event) => {
        const { name, value } = event.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateTransaction = () => {
        if (!selectedTransaction || !editFormData) return;

        const payload = {
            ...editFormData,
            price: parseFloat(editFormData.price),
            quantity: parseFloat(editFormData.quantity),
            commission: parseFloat(editFormData.commission),
            date: new Date(editFormData.date).toISOString()
        };

        apiClient.put(`${portfolioId}/transactions/${selectedTransaction.transactionId}/update`, payload)
            .then(response => {
                const updatedTransaction = response.data;
                const updatedTransactions = transactions.map(t =>
                    t.transactionId === selectedTransaction.transactionId ? updatedTransaction : t
                );
                setTransactions(updatedTransactions);
                transactionCache.current[selectedYear] = updatedTransactions.reverse();
                handleEditClose();
            })
            .catch(err => {
                console.error('Error updating transaction:', err);
                setError(err);
            });
    };

    // --- Delete Handlers ---
    const handleDeleteClick = (transaction) => {
        setSelectedTransaction(transaction);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteClose = () => {
        setDeleteConfirmOpen(false);
        setSelectedTransaction(null);
    };

    const handleDeleteConfirm = () => {
        if (!selectedTransaction) return;

        apiClient.delete(`${portfolioId}/transactions/${selectedTransaction.transactionId}/delete`)
            .then(() => {
                const updatedTransactions = transactions.filter(t => t.transactionId !== selectedTransaction.transactionId);
                setTransactions(updatedTransactions);
                transactionCache.current[selectedYear] = updatedTransactions;
                handleDeleteClose();
            })
            .catch(err => {
                console.error('Error deleting transaction:', err);
                setError(err);
                handleDeleteClose();
            });
    };


    const yearOptions = Array.from(
        { length: defaultCurrentYear - cachedFirstTradeYear + 1 },
        (_, index) => cachedFirstTradeYear + index
    );

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex h-64 items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="rounded-md bg-red-50 p-4 mt-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error loading transactions</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error.message || 'An unknown error occurred.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (!transactions || transactions.length === 0) {
            return (
                <div className="mt-6 text-center rounded-lg border-2 border-dashed border-slate-300 p-12">
                    <FilterListIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">No transactions</h3>
                    <p className="mt-1 text-sm text-slate-500">No transactions found for the year {selectedYear}.</p>
                </div>
            );
        }

        const reverseTransactions = [...transactions].reverse();

        return (
            <div className="mt-6 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-slate-300">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Ticker</th>
                                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Quantity</th>
                                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Price ($)</th>
                                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Total ($)</th>
                                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">Comm. ($)</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Date</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Type</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {reverseTransactions.map((transaction) => {
                                        const formattedDate = new Date(transaction.date).toLocaleString('en-GB', {
                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                            hour: '2-digit', minute: '2-digit', hour12: false
                                        }).replace(',', '');

                                        const isBuy = transaction.transactionType === 'BUY';
                                        const isSell = transaction.transactionType === 'SELL';
                                        const typeColor = isBuy ? 'text-green-700 bg-green-50 ring-green-600/20' :
                                            isSell ? 'text-red-700 bg-red-50 ring-red-600/20' :
                                                'text-slate-700 bg-slate-50 ring-slate-600/20';

                                        return (
                                            <tr key={transaction.transactionId} className="hover:bg-slate-50">
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                                                            {/* Placeholder icon */}
                                                            <span className="text-xs font-bold text-slate-500">{transaction.ticker.substring(0, 2)}</span>
                                                        </div>
                                                        <div>{transaction.ticker}</div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-slate-500">{transaction.quantity}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-slate-500">{transaction.price?.toFixed(2) ?? 'N/A'}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-slate-900 font-medium">{transaction.totalAmount?.toFixed(2) ?? 'N/A'}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-slate-500">{transaction.commission?.toFixed(2) ?? 'N/A'}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{formattedDate}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${typeColor}`}>
                                                        {transaction.transactionType}
                                                    </span>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEditClick(transaction)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-slate-100"
                                                        >
                                                            <EditIcon className="h-4 w-4" />
                                                            <span className="sr-only">Edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(transaction)}
                                                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-slate-100"
                                                        >
                                                            <DeleteIcon className="h-4 w-4" />
                                                            <span className="sr-only">Delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold leading-6 text-slate-900">Transactions</h1>
                    <p className="mt-2 text-sm text-slate-700">
                        A list of all your transactions for the selected year.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                        <InputLabel id="year-select-label">Year</InputLabel>
                        <Select
                            labelId="year-select-label"
                            id="year-select"
                            value={selectedYear}
                            label="Year"
                            onChange={handleYearChange}
                            disabled={loading}
                        >
                            {yearOptions.map((year) => (
                                <MenuItem key={year} value={year}>
                                    {year}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </div>
            </div>

            {renderContent()}

            {/* Edit Transaction Dialog */}
            <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
                <DialogTitle className="font-bold">Edit Transaction</DialogTitle>
                <DialogContent>
                    <DialogContentText className="mb-4">
                        Update the details for the transaction.
                    </DialogContentText>
                    {editFormData && (
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <div className="grid grid-cols-2 gap-4">
                                <TextField
                                    name="ticker"
                                    label="Ticker"
                                    fullWidth
                                    variant="outlined"
                                    value={editFormData.ticker}
                                    onChange={handleEditFormChange}
                                />
                                <TextField
                                    name="date"
                                    label="Date"
                                    type="datetime-local"
                                    fullWidth
                                    variant="outlined"
                                    value={editFormData.date}
                                    onChange={handleEditFormChange}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormControl fullWidth>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                        name="transactionType"
                                        value={editFormData.transactionType}
                                        label="Type"
                                        onChange={handleEditFormChange}
                                    >
                                        <MenuItem value='BUY'>BUY</MenuItem>
                                        <MenuItem value='SELL'>SELL</MenuItem>
                                        <MenuItem value='TAX'>TAX</MenuItem>
                                        <MenuItem value='DIVIDEND'>DIVIDEND</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth>
                                    <InputLabel>Asset Class</InputLabel>
                                    <Select
                                        name="assetType"
                                        value={editFormData.assetType}
                                        label="Asset Class"
                                        onChange={handleEditFormChange}
                                    >
                                        <MenuItem value='STOCK'>STOCK</MenuItem>
                                        <MenuItem value='FIGURINE'>FIGURINE</MenuItem>
                                        <MenuItem value='COIN'>COIN</MenuItem>
                                        <MenuItem value='FUND'>FUND</MenuItem>
                                        <MenuItem value="CRYPTO">CRYPTO</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <TextField
                                    name="quantity"
                                    label="Qty"
                                    type="number"
                                    fullWidth
                                    value={editFormData.quantity}
                                    onChange={handleEditFormChange}
                                />
                                <TextField
                                    name="price"
                                    label="Price"
                                    type="number"
                                    fullWidth
                                    value={editFormData.price}
                                    onChange={handleEditFormChange}
                                />
                                <TextField
                                    name="commission"
                                    label="Comm."
                                    type="number"
                                    fullWidth
                                    value={editFormData.commission}
                                    onChange={handleEditFormChange}
                                />
                            </div>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditClose}>Cancel</Button>
                    <Button onClick={handleUpdateTransaction} variant="contained" color="primary">Save Changes</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={handleDeleteClose}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this transaction? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteClose}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default TransactionsList;