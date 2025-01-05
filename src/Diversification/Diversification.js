import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import NavigationLinks from '../components/NavigationLinks';
import {
    Typography, Box, Container, Card, CardContent, Alert, CircularProgress, Grid
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
                {payload.country}
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
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value} USD`}</text>
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
    const [activeIndex, setActiveIndex] = useState(-1);

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
        country,
        amount: parseFloat(amount.toFixed(2))
    }));

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    return (
        <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <Container sx={{ mt: 4 }}>
                <NavigationLinks />
            </Container>
            <Container sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>Diversification</Typography>
            </Container>
            <Container sx={{ mt: 4 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Typography variant="h6" gutterBottom>Diversification by Country</Typography>
                                    <Pie
                                        activeIndex={activeIndex}
                                        activeShape={renderActiveShape}
                                        data={pieChartAmountByCountryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="amount"
                                        onMouseEnter={onPieEnter}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Container>
        </Box>
    );
};

export default Diversification;