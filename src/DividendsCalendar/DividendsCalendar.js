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
                setLoading(false);
            });
    }, [portfolioId]);

    useEffect(() => {
        fetchdDivCalendar();
    }, [fetchdDivCalendar]);

    if (loading) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Container>
        );
    }
    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">{error.message}</Alert>
            </Container>
        );
    };

    if (!dividendsCalendar) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="info">No dividend data available.</Alert>
            </Container>
        )
    }

    return (
        <Box sx={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
            <Container sx={{ mt: 4 }}>
                <NavigationLinks />
            </Container>
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
                                            return total + (dividend.dividendAmount * dividend.stockQuantity);
                                        }, 0).toFixed(2)}
                                </Typography>
                                {/* Grid for dividends within the month */}
                                <Grid container spacing={2}>
                                    {Array.isArray(dividendsCalendar[month]) &&
                                        dividendsCalendar[month].map((dividend, index) => {
                                            const { ticker, dividendAmount, stockQuantity } = dividend;
                                            return (
                                                <Grid item xs={12} key={index}>
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
                                                                        ${(dividendAmount * stockQuantity).toFixed(2)}
                                                                    </Typography>
                                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                                        {stockQuantity}×${dividendAmount}
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
        </Box>
    );
}

export default DividendsCalendar;