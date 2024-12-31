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
    Typography,
    Paper,
    Stack,
    Link,
    Box
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

const Dividends = () => {
    const { portfolioId } = useParams();
    const [dividends, setDividends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDividends = useCallback(() => {
        axios.get(`http://localhost:8080/api/v1/${portfolioId}/dividends`)
            .then(response => {
                setDividends(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching dividends:', error);
                setError(error);
                setLoading(false);
            });
    }, [portfolioId]);

    useEffect(() => {
        fetchDividends();
    }, [fetchDividends]);

    if (loading) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
                <CircularProgress />
                <p>Loading dividends...</p>
            </Box>
        );
    }
    if (error) return <p>Error loading dividends: {error.message}</p>;

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
                <Link href={`/${portfolioId}/transactions`} underline="none" sx={{ color: 'primary.main' }}>
                    Transactions
                </Link>
                <Link href={`/${portfolioId}/dividends`} underline="none" sx={{ color: 'primary.main' }}>
                    Dividends
                </Link>
                <Link href={`/${portfolioId}/dividend-calendar`} underline="none" sx={{ color: 'primary.main' }}>
                    Dividend Calendar
                </Link>
                <Link href={`/${portfolioId}/diversification`} underline="none" sx={{ color: 'primary.main' }}>
                    Diversification
                </Link>
            </Stack>
            <Typography variant="h4" gutterBottom>Dividends</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Ticker</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={3} align="center">No dividends found.</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default Dividends;