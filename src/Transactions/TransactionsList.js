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
    MenuItem
} from '@mui/material';
import NavigationLinks from '../components/NavigationLinks';
import apiClient from '../api/api';

const TransactionsList = () => {
    const { portfolioId } = useParams();

    const defaultCurrentYear = new Date().getFullYear();
    // Get firstTradeYear from localStorage. If not found, use current year.
    const cachedFirstTradeYear = localStorage.getItem('firstTradeYear')
        ? parseInt(localStorage.getItem('firstTradeYear'))
        : defaultCurrentYear;

    // Use current year as default selected year.
    const [selectedYear, setSelectedYear] = useState(defaultCurrentYear);
    const [transactions, setTransactions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // In-memory cache
    const transactionCache = useRef({});

    const fetchTransactionList = useCallback(() => {
        setLoading(true);
        if (transactionCache.current[selectedYear]) {
            setTransactions(transactionCache.current[selectedYear]);
            setLoading(false);
            return;
        }
        apiClient.get(`${portfolioId}/transactions/${selectedYear}`)
            .then(response => {
                setTransactions(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching transactions:', error);
                setError(error);
                setLoading(false);
            });
    }, [portfolioId, selectedYear]);

    useEffect(() => {
        fetchTransactionList();
    }, [fetchTransactionList]);

    const reverseTransactions = transactions ? [...transactions].reverse() : [];

    if (loading) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
                <CircularProgress />
                <p>Loading transactions...</p>
            </Box>
        );
    }
    if (error) return <p>Error loading transactions: {error.message}</p>;
    if (!transactions) return <p>Transactions not found.</p>;

    return (
        <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Navigation Links */}
            <NavigationLinks />

            {/* Year Dropdown */}
            <FormControl variant="outlined" sx={{ minWidth: 120, mb: 2 }}>
                <InputLabel id="year-select-label">Year</InputLabel>
                <Select
                    labelId="year-select-label"
                    id="year-select"
                    value={selectedYear}
                    label="Year"
                    onChange={(e) => {
                        const newYear = parseInt(e.target.value);
                        setTransactions(null);
                        setSelectedYear(newYear);
                    }}
                >
                    {Array.from(
                        { length: defaultCurrentYear - cachedFirstTradeYear + 1 },
                        (_, index) => {
                            const year = cachedFirstTradeYear + index;
                            return (
                                <MenuItem key={year} value={year}>
                                    {year}
                                </MenuItem>
                            );
                        }
                    )}
                </Select>
            </FormControl>

            <TableContainer component={Paper}
                sx={{
                    mt: 3,
                    mb: 3,
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    '& .MuiTable-root': {
                        minWidth: 650,
                    }
                }}>
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
                    <TableBody sx={{
                        '& tr:nth-of-type(odd)': {
                            backgroundColor: 'rgba(0, 0, 0, 0.03)',
                        },
                        '& tr:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            transition: 'background-color 0.2s ease',
                        },
                        '& td': {
                            padding: '16px',
                            fontSize: '0.875rem',
                            borderBottom: '1px solid rgba(224, 224, 224, 1)',
                        }
                    }}>
                        {reverseTransactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    No transactions found.
                                </TableCell>
                            </TableRow>
                        ) :
                            reverseTransactions.map((transaction) => {
                                const formattedDate = new Date(transaction.date).toLocaleString('en-GB', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                }).replace(',', '');
                                return (
                                    <TableRow key={transaction.transactionId}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <img
                                                    src={`/images/${transaction.ticker}_icon.png`}
                                                    alt={transaction.ticker}
                                                    style={{ width: 24, height: 24, marginRight: 10 }}
                                                    // Optional: Add error handling for missing images
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                <Typography>{transaction.ticker}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">{transaction.quantity}</TableCell>
                                        <TableCell align="right">{transaction.price.toFixed(2)}</TableCell>
                                        <TableCell align="right">{transaction.totalAmount.toFixed(2)}</TableCell>
                                        <TableCell align="right">{transaction.commission.toFixed(2)}</TableCell>
                                        <TableCell>{formattedDate}</TableCell>
                                        <TableCell>{transaction.transactionType}</TableCell>
                                    </TableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default TransactionsList;