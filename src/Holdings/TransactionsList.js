import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Stack,
    Link,
    Box
} from '@mui/material';



const TransactionsList = () => {
    const { portfolioId } = useParams();
    /*const navigate = useNavigate();*/
    const [transactions, setTransactions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTransactionList = useCallback(() => {
        axios.get(`http://localhost:8080/api/v1/${portfolioId}/transactions`)
            .then(response => {
                setTransactions(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching holdings details:', error);
                setError(error);
                setLoading(false);
            });
    }, [portfolioId]);

    useEffect(() => {
        fetchTransactionList();
    }, [fetchTransactionList]);

    if (loading) return <p>Loading holdings ...</p>;
    if (error) return <p>Error loading holdings: {error.message}</p>;
    if (!transactions) return <p>Transactions not found.</p>;

    return (
        <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Navigation Links */}
            <Stack
                direction="row"
                spacing={4}
                sx={{
                    mt: 2,
                    mb: 2,
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '8px',
                    '& a': {
                        fontSize: '1rem',
                        fontWeight: 500,
                        transition: 'color 0.2s ease',
                        '&:hover': {
                            color: 'secondary.main'
                        }
                    }
                }}
            >
                <Link
                    href={`/${portfolioId}`}
                    underline="none"
                    sx={{ color: 'primary.main' }}
                >
                    Dashboard
                </Link>
                <Link href={`${portfolioId}/transactions`} underline="none" sx={{ color: 'primary.main' }}>
                    Transactions
                </Link>
                <Link href="/dividends" underline="none" sx={{ color: 'primary.main' }}>
                    Dividends
                </Link>
                <Link href="/dividend-calendar" underline="none" sx={{ color: 'primary.main' }}>
                    Dividend Calendar
                </Link>
                <Link href="/diversification" underline="none" sx={{ color: 'primary.main' }}>
                    Diversification
                </Link>
            </Stack>

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
                <Table  >
                    <TableHead>
                        <TableRow  >
                            <TableCell  >Ticker</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Price ($)</TableCell>
                            <TableCell align="right">Total Amount ($)</TableCell>
                            <TableCell align="right">Commission ($)</TableCell>
                            <TableCell  >Date</TableCell>
                            <TableCell  >Type</TableCell>
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
                        {transactions.map((transaction) => {
                            const formattedDate = new Date(transaction.date).toLocaleString('en-GB', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            }).replace(',', '');
                            return (
                                <TableRow key={transaction.transactionId}  >
                                    <TableCell  >{transaction.ticker}</TableCell>
                                    <TableCell align="right">{transaction.quantity}</TableCell>
                                    <TableCell align="right">{transaction.price.toFixed(2)}</TableCell>
                                    <TableCell align="right">{transaction.totalAmount.toFixed(2)}</TableCell>
                                    <TableCell align="right">{transaction.commission.toFixed(2)}</TableCell>
                                    <TableCell  >{formattedDate}</TableCell>
                                    <TableCell  >{transaction.transactionType}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer >

        </Box >);
};

export default TransactionsList;