import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
    Table, Typography,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Box,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
    TextField,
    Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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
            console.log(`Using cached transactions for year ${yearToFetch}:`);
            return;
        }

        apiClient.get(`${portfolioId}/transactions/${yearToFetch}`)
            .then(response => {
                const data = response.data || [];
                transactionCache.current[yearToFetch] = data;
                setTransactions(data);
                setLoading(false);
                console.log(`Fetched transactions for year ${yearToFetch}:`);
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
            quantity: transaction.quantity,
            price: transaction.price,
            commission: transaction.commission,
            date: new Date(transaction.date).toISOString().slice(0, 16) // Format for datetime-local input
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

        // Construct payload with correct data types
        const payload = {
            ...editFormData,
            price: parseFloat(editFormData.price),
            quantity: parseFloat(editFormData.quantity),
            commission: parseFloat(editFormData.commission),
            date: new Date(editFormData.date).toISOString()
        };

        apiClient.put(`${portfolioId}/transactions/${selectedTransaction.transactionId}/update`, payload) // TODO update a updating process to match back end
            .then(response => {
                const updatedTransaction = response.data;
                const updatedTransactions = transactions.map(t =>
                    t.transactionId === selectedTransaction.transactionId ? updatedTransaction : t
                );
                updatedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                setTransactions(updatedTransactions);
                transactionCache.current[selectedYear] = updatedTransactions; // Update cache
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
                transactionCache.current[selectedYear] = updatedTransactions; // Update cache
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
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" sx={{ mt: 4, height: '40vh' }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>Loading transactions...</Typography>
                </Box>
            );
        }

        if (error) {
            return (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Error loading transactions: {error.message || 'An unknown error occurred.'}
                </Alert>
            );
        }

        if (!transactions || transactions.length === 0) {
            return (
                <TableContainer component={Paper} sx={tableContainerStyles}>
                    <Table>
                        <TableHead>
                            {/* Render headers even when empty for consistency */}
                            <TableRow>
                                <TableCell>Ticker</TableCell>
                                <TableCell align="right">Quantity</TableCell>
                                <TableCell align="right">Price ($)</TableCell>
                                <TableCell align="right">Total Amount ($)</TableCell>
                                <TableCell align="right">Commission ($)</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    <Typography>No transactions found for the year {selectedYear}.</Typography>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            );
        }

        const reverseTransactions = [...transactions].reverse();
        return (
            <TableContainer component={Paper} sx={tableContainerStyles}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Ticker</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Price ($)</TableCell>
                            <TableCell align="right">Total Amount ($)</TableCell>
                            <TableCell align="right">Commission ($)</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody sx={tableBodyStyles}>
                        {reverseTransactions.map((transaction) => {
                            const formattedDate = new Date(transaction.date).toLocaleString('en-GB', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit', hour12: false
                            }).replace(',', '');
                            return (
                                <TableRow key={transaction.transactionId}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <img
                                                src={`/images/${transaction.ticker}_icon.png`}
                                                alt={transaction.ticker}
                                                style={{ width: 24, height: 24, marginRight: 10 }}
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                            <Typography>{transaction.ticker}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">{transaction.quantity}</TableCell>
                                    <TableCell align="right">{transaction.price?.toFixed(2) ?? 'N/A'}</TableCell>
                                    <TableCell align="right">{transaction.totalAmount?.toFixed(2) ?? 'N/A'}</TableCell>
                                    <TableCell align="right">{transaction.commission?.toFixed(2) ?? 'N/A'}</TableCell>
                                    <TableCell>{formattedDate}</TableCell>
                                    <TableCell>{transaction.transactionType}</TableCell>
                                    <TableCell align="right">
                                        <IconButton onClick={() => handleEditClick(transaction)} size="small" aria-label="edit">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton onClick={() => handleDeleteClick(transaction)} size="small" aria-label="delete">
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const tableContainerStyles = {
        mt: 3,
        mb: 3,
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        '& .MuiTable-root': {
            minWidth: 650,
        }
    };

    const tableBodyStyles = {
        '& tr:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.03)' },
        '& tr:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)', transition: 'background-color 0.2s ease' },
        '& td': { padding: '16px', fontSize: '0.875rem', borderBottom: '1px solid rgba(224, 224, 224, 1)' }
    };


    // --- Main Return Structure ---
    return (
        <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>


            {/* Year Dropdown - Always Visible */}
            <FormControl variant="outlined" sx={{ minWidth: 120, mt: 2, mb: 2 }}> {/* Added mt */}
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

            {renderContent()}

            {/* Edit Transaction Dialog */}
            <Dialog open={editDialogOpen} onClose={handleEditClose}>
                <DialogTitle>Edit Transaction</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Update the details for the transaction.
                    </DialogContentText>
                    {editFormData && (
                        <Stack spacing={2} sx={{ mt: 2 }}>
                            <TextField
                                autoFocus
                                margin="dense"
                                name="quantity"
                                label="Quantity"
                                type="number"
                                fullWidth
                                variant="outlined"
                                value={editFormData.quantity}
                                onChange={handleEditFormChange}
                            />
                            <TextField
                                margin="dense"
                                name="price"
                                label="Price ($)"
                                type="number"
                                fullWidth
                                variant="outlined"
                                value={editFormData.price}
                                onChange={handleEditFormChange}
                            />
                            <TextField
                                margin="dense"
                                name="commission"
                                label="Commission ($)"
                                type="number"
                                fullWidth
                                variant="outlined"
                                value={editFormData.commission}
                                onChange={handleEditFormChange}
                            />
                            <TextField
                                margin="dense"
                                name="date"
                                label="Date"
                                type="datetime-local"
                                fullWidth
                                variant="outlined"
                                value={editFormData.date}
                                onChange={handleEditFormChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditClose}>Cancel</Button>
                    <Button onClick={handleUpdateTransaction} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={handleDeleteClose}
            >
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

        </Box>
    );
};

export default TransactionsList;