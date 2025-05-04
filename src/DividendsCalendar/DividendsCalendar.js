import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
    Typography, Box, Container, Card, CardContent, Alert, CircularProgress, Grid
} from '@mui/material';
import NavigationLinks from '../components/NavigationLinks';
import apiClient from '../api/api';


const DividendsCalendar = () => {
    const { portfolioId } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dividendsCalendar, setDividendsCalendar] = useState([]);

    const fetchdDivCalendar = useCallback(() => {
        apiClient.get(`${portfolioId}/dividends-calendar`)
            .then(response => {
                setDividendsCalendar(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching dividend calendar:', error);
                setError(error);
                setDividendsCalendar(null);
                setLoading(false);
            });
    }, [portfolioId]);

    useEffect(() => {
        fetchdDivCalendar();
    }, [fetchdDivCalendar]);

    const renderContent = () => {
        if (loading) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (error) {
            return (
                <Container sx={{ mt: 4 }}>
                    <Alert severity="error">
                        Error fetching dividend data: {error.message || 'An unknown error occurred.'}
                    </Alert>
                </Container>
            );
        }

        if (!dividendsCalendar || Object.keys(dividendsCalendar).length === 0) {
            return (
                <Container sx={{ mt: 4 }}>
                    <Alert severity="info">Dividend calendar is not available.</Alert>
                </Container>
            );
        }

        return (
            <Grid container spacing={3} sx={{ mt: 2 }}>
                {Object.keys(dividendsCalendar).map((month) => (
                    <Grid
                        item
                        xs={12}
                        key={month}
                        display="flex"
                        justifyContent="center"
                    >
                        {/* Outer card for the month */}
                        <Card
                            sx={{
                                mb: 3,
                                boxShadow: 3,
                                maxWidth: 1000,
                                width: '100%'
                            }}
                        >
                            <CardContent>
                                <Typography variant="h5" component="div" sx={{ mb: 2 }}>
                                    {month}
                                </Typography>
                                {/* Calculate total dividends for the month */}
                                <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                                    Total Dividends: $
                                    {Array.isArray(dividendsCalendar[month]) &&
                                        dividendsCalendar[month].reduce((total, dividend) => {
                                            const amount = typeof dividend.dividendAmount === 'number' ? dividend.dividendAmount : 0;
                                            const quantity = typeof dividend.stockQuantity === 'number' ? dividend.stockQuantity : 0;
                                            return total + (amount * quantity);
                                        }, 0).toFixed(2)}
                                </Typography>
                                {/* Grid for dividends within the month */}
                                <Grid container spacing={2}>
                                    {Array.isArray(dividendsCalendar[month]) &&
                                        dividendsCalendar[month].map((dividend, index) => {
                                            const { ticker = 'N/A', dividendAmount = 0, stockQuantity = 0 } = dividend;
                                            const totalDividend = (dividendAmount * stockQuantity).toFixed(2);

                                            return (
                                                <Grid item xs={12} key={`${ticker}-${index}`}>
                                                    {/* Inner card for each dividend */}
                                                    <Card sx={{ backgroundColor: '#f5f5f5' }}>
                                                        <CardContent>
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'flex-start'
                                                                }}
                                                            >
                                                                {/* Left: Ticker */}
                                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                                    <Box sx={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}>
                                                                        <img
                                                                            onError={(e) => { e.target.style.display = 'none'; e.target.onerror = null; }}
                                                                            src={`/images/${ticker}_icon.png`}
                                                                            alt={ticker}
                                                                            style={{ width: 30, height: 30, marginRight: 15 }}
                                                                        />
                                                                        {ticker}
                                                                    </Box>
                                                                </Typography>
                                                                {/* dividends on right */}
                                                                <Box sx={{ textAlign: 'right' }}>
                                                                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                                        ${totalDividend}
                                                                    </Typography>
                                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                                        {stockQuantity} × ${dividendAmount.toFixed(2)}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            );
                                        })}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        );
    };


    return (
        <Box sx={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* NavigationLinks are always rendered */}
            <Container sx={{ mt: 4 }}>
                <NavigationLinks />
            </Container>
            <Container sx={{ mt: 4 }}>
                {renderContent()}
            </Container>
        </Box>
    );
}

export default DividendsCalendar;