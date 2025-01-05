import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
    Typography, Box, Container, Card, CardContent, Alert, CircularProgress, Grid
} from '@mui/material';
import NavigationLinks from '../components/NavigationLinks';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StockTooltip, DividendsByMonthTooltip, DividendsByQuarterTooltip, DividendsByYearTooltip } from '../components/Tooltips';

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
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Container>
        );
    }
    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    };

    if (!dividends) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="info">No dividends available.</Alert>
            </Container>
        )
    }

    const yearlyCombineDividendsProjection = dividends.yearlyCombineDividendsProjection;
    const monthlyDividendsAverage = yearlyCombineDividendsProjection / 12;
    const dailyDividendsAverage = yearlyCombineDividendsProjection / 365;
    const hourlyDividendsAverage = dailyDividendsAverage / 24;

    const barChartAmountByYearData = Object.entries(dividends.amountByMonth || {})
        .map(([month, amount]) => {
            const date = new Date(month);
            const year = date.getFullYear();
            return {
                year,
                amount: parseFloat(amount)
            };
        })
        .reduce((acc, { year, amount }) => {
            if (!acc[year]) {
                acc[year] = 0;
            }
            acc[year] += amount;
            return acc;
        }, {});

    const barChartAmountByYearArray = Object.entries(barChartAmountByYearData)
        .map(([year, amount]) => ({
            year,
            amount: parseFloat(amount.toFixed(2))
        }))
        .sort((a, b) => a.year - b.year);

    const barChartAmountByQuarterData = Object.entries(dividends.amountByMonth || {})
        .map(([month, amount]) => {
            const date = new Date(month);
            const year = date.getFullYear();
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            return {
                yearQuarter: `${year} Q${quarter}`,
                amount: parseFloat(amount)
            };
        })
        .reduce((acc, { yearQuarter, amount }) => {
            if (!acc[yearQuarter]) {
                acc[yearQuarter] = 0;
            }
            acc[yearQuarter] += amount;
            return acc;
        }, {});

    const barChartAmountByQuarterArray = Object.entries(barChartAmountByQuarterData)
        .map(([yearQuarter, amount]) => ({
            yearQuarter,
            amount: parseFloat(amount.toFixed(2))
        }))
        .sort((a, b) => a.yearQuarter.localeCompare(b.yearQuarter));

    const barChartAmountByMonthdata = Object.entries(dividends.amountByMonth || {}).map(([month, amount]) => ({
        month,
        amount: parseFloat(amount.toFixed(2))
    }))
        .sort((a, b) => new Date(a.month) - new Date(b.month));

    const tickerAmountArray = dividends.tickerAmount || [];
    const tickerAmountObject = tickerAmountArray.reduce((acc, obj) => ({ ...acc, ...obj }), {});
    const barChartAllDivByStockdata = Object.entries(tickerAmountObject)
        .map(([ticker, amount]) => ({
            ticker,
            amount: parseFloat(amount).toFixed(2)
        }))
        .sort((a, b) => a.ticker.localeCompare(b.ticker));

    return (
        <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <Container sx={{ mt: 4 }}>
                <NavigationLinks />
            </Container>

            <Container sx={{ mt: 4 }}>
                <Typography variant='h6' gutterBottom>
                    Stock Dividends Projection
                </Typography>
                <Card>
                    <CardContent>
                        <Typography variant='h6' gutterBottom>
                            Yearly Projection: ${yearlyCombineDividendsProjection.toFixed(2)}
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="h7">Monthly Average:</Typography>
                                <Typography>${monthlyDividendsAverage.toFixed(2)}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Typography variant="h7">Daily Average:</Typography>
                                <Typography>${dailyDividendsAverage.toFixed(2)}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Typography variant="h7">Hourly Average:</Typography>
                                <Typography>${hourlyDividendsAverage.toFixed(2)}</Typography>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Container>
            <Box sx={{ mt: 4 }} >
                <Container><Typography variant='h6' gutterBottom>Dividends received</Typography></Container>

                <Container>
                    <Card sx={{ mt: 4 }}>
                        <CardContent>
                            <Typography variant='h6' gutterBottom>Dividends By Year</Typography>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={barChartAmountByYearArray}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" />
                                    <YAxis />
                                    <Tooltip content={<DividendsByYearTooltip />} />
                                    <Legend />
                                    <Bar dataKey="amount" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Container>
                <Container>
                    <Card sx={{ mt: 4 }}>
                        <CardContent>
                            <Typography variant='h6' gutterBottom>Dividends By Quarter</Typography>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={barChartAmountByQuarterArray}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="yearQuarter" />
                                    <YAxis />
                                    <Tooltip content={<DividendsByQuarterTooltip />} />
                                    <Legend />
                                    <Bar dataKey="amount" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Container>
                <Container>
                    <Card sx={{ mt: 4 }}>
                        <CardContent>
                            <Typography variant='h6' gutterBottom>
                                Dividends By Month
                            </Typography>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={barChartAmountByMonthdata}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip content={<DividendsByMonthTooltip />} />
                                    <Legend />
                                    <Bar dataKey="amount" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Container>
                <Container>
                    <Card sx={{ mt: 4 }}>
                        <CardContent>
                            <Typography variant='h6' gutterBottom>
                                All Time Dividends By Stock
                            </Typography>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={barChartAllDivByStockdata}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="ticker" />
                                    <YAxis />
                                    <Tooltip content={<StockTooltip />} />
                                    <Legend />
                                    <Bar dataKey="amount" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Container>
            </Box>
        </Box>
    );
};

export default Dividends;