import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import NavigationLinks from '../components/NavigationLinks';
import {
    Typography, Box, Container, Card, CardContent, Alert, CircularProgress,
    Grid
} from '@mui/material';
import { PieChart, Pie, Sector, ResponsiveContainer } from 'recharts';

const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
                {`${payload.amount.toFixed(2)} USD`}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 6}
                outerRadius={outerRadius + 10}
                fill={fill}
            />
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
            <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${payload.name}`}</text>
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
                {`(Rate ${(percent * 100).toFixed(2)}%)`}
            </text>
        </g>
    );
};

const Diversification = () => {
    const { portfolioId } = useParams();
    const [diversification, setDiversification] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeIndexByCountry, setActiveIndexByCountry] = useState(-1);
    const [activeIndexBySector, setActiveIndexBySector] = useState(-1);
    const [activeIndexByIndustry, setActiveIndexByIndustry] = useState(-1);
    const [activeIndexByStock, setActiveIndexByStock] = useState(-1);

    const fetchdDiversification = useCallback(() => {
        axios.get(`http://localhost:8080/api/v1/${portfolioId}/diversification`)
            .then(response => {
                setDiversification(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching diversification:', error);
                setError(error);
                setLoading(false);
            });
    }, [portfolioId]);

    useEffect(() => {
        fetchdDiversification();
    }, [fetchdDiversification]);

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

    if (!diversification) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="info">No diversification data available.</Alert>
            </Container>
        )
    }

    console.log(diversification);

    const pieChartAmountByCountryData = Object.entries(diversification.amountByCountry || {}).map(([country, amount]) => ({
        name: country,
        amount: parseFloat(amount.toFixed(2))
    }));

    const pieChartAmountBySectorData = Object.entries(diversification.amountBySector || {}).map(([sector, amount]) => ({
        name: sector,
        amount: parseFloat(amount.toFixed(2))
    }));

    const pieChartAmountByIndustryData = Object.entries(diversification.amountByIndustry || {}).map(([industry, amount]) => ({
        name: industry,
        amount: parseFloat(amount.toFixed(2))
    }));

    const pieChartAmountByStockData = Object.entries(diversification.amountByStock || {}).map(([stock, amount]) => ({
        name: stock,
        amount: parseFloat(amount.toFixed(2))
    }));


    const onPieByCountryEnter = (_, index) => {
        setActiveIndexByCountry(index);
    };
    const onPieBySectorEnter = (_, index) => {
        setActiveIndexBySector(index);
    };
    const onPieByIndustryEnter = (_, index) => {
        setActiveIndexByIndustry(index);
    };
    const onPieByStockEnter = (_, index) => {
        setActiveIndexByStock(index);
    };

    return (
        <Box sx={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
            <Container sx={{ mt: 4 }}>
                <NavigationLinks />
            </Container>
            <Container sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>Diversification</Typography>
            </Container>
            <Container sx={{ mt: 2 }}>
                <Grid container spacing={3}>
                    <Grid item xs={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>By Country</Typography>
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>

                                        <Pie
                                            activeIndex={activeIndexByCountry}
                                            activeShape={renderActiveShape}
                                            data={pieChartAmountByCountryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="amount"
                                            onMouseEnter={onPieByCountryEnter}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>By Sector</Typography>
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            activeIndex={activeIndexBySector}
                                            activeShape={renderActiveShape}
                                            data={pieChartAmountBySectorData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="amount"
                                            onMouseEnter={onPieBySectorEnter}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>By Industry</Typography>
                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            activeIndex={activeIndexByIndustry}
                                            activeShape={renderActiveShape}
                                            data={pieChartAmountByIndustryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="amount"
                                            onMouseEnter={onPieByIndustryEnter}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>By Stock</Typography>

                                <ResponsiveContainer width="100%" height={400}>
                                    <PieChart>
                                        <Pie
                                            activeIndex={activeIndexByStock}
                                            activeShape={renderActiveShape}
                                            data={pieChartAmountByStockData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="amount"
                                            onMouseEnter={onPieByStockEnter}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default Diversification;