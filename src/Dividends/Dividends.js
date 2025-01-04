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
    Box, Container, Card, CardContent, Grid, Alert, CircularProgress,
    Grid2
} from '@mui/material';
import NavigationLinks from '../components/NavigationLinks';


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
    console.log(dividends);
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

    return (
        <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>

            <NavigationLinks />

            <Typography variant="h5" gutterBottom>Dividends</Typography>
            <Container sx={{ mt: 4 }}>
                <Typography variant='h5' gutterBottom>
                    Stock Dividends Projection
                </Typography>
                <Card>
                    <CardContent>
                        <Typography variant='h6' gutterBottom>
                            Yearly Projection: ${yearlyCombineDividendsProjection.toFixed(2)}
                        </Typography>
                        <Grid2 container spacing={2}>
                            <Grid2 item xs={12} sm={6}>
                                <Typography variant="h7">Monthly Average:</Typography>
                                <Typography>${monthlyDividendsAverage.toFixed(2)}</Typography>
                            </Grid2>
                            <Grid2 item xs={12} sm={4}>
                                <Typography variant="h7">Daily Average:</Typography>
                                <Typography>${dailyDividendsAverage.toFixed(2)}</Typography>
                            </Grid2>
                            <Grid2 item xs={12} sm={4}>
                                <Typography variant="h7">Hourly Average:</Typography>
                                <Typography>${hourlyDividendsAverage.toFixed(2)}</Typography>
                            </Grid2>
                        </Grid2>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
};

export default Dividends;