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
    Alert
} from '@mui/material';
import NavigationLinks from '../components/NavigationLinks';
import apiClient from '../api/api';

const TransactionsList = () => {
    const { portfolioId } = useParams();

    const defaultCurrentYear = new Date().getFullYear();
    const cachedFirstTradeYear = parseInt(localStorage.getItem('firstTradeYear') || defaultCurrentYear.toString(), 10);

    const [selectedYear, setSelectedYear] = useState(defaultCurrentYear);
    const [transactions, setTransactions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
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
            {/* Navigation Links - Always Visible */}
            <NavigationLinks />

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

        </Box>
    );
};

export default TransactionsList;