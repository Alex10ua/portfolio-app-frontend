import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import NavigationLinks from '../components/NavigationLinks';
import {
    Typography, Box, Container, Card, CardContent, Alert, CircularProgress,
    Grid
} from '@mui/material';
import { PieChart, Pie, Sector, ResponsiveContainer } from 'recharts';
import apiClient from '../api/api';

const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, name, amount } = props; // Destructure name & amount here too for clarity
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    const displayName = name || payload.name;
    const displayAmount = amount || payload.amount;

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
                {`${typeof displayAmount === 'number' ? displayAmount.toFixed(2) : 'N/A'} USD`}
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
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${displayName}`}</text>
            {typeof percent === 'number' && (
                <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
                    {`(Rate ${(percent * 100).toFixed(2)}%)`}
                </text>
            )}
        </g>
    );
};

const Diversification = () => {
    const { portfolioId } = useParams();
    const [diversification, setDiversification] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeIndexByCountry, setActiveIndexByCountry] = useState(-1);
    const [activeIndexBySector, setActiveIndexBySector] = useState(-1);
    const [activeIndexByIndustry, setActiveIndexByIndustry] = useState(-1);
    const [activeIndexByStock, setActiveIndexByStock] = useState(-1);

    const fetchDiversification = useCallback(() => {
        setLoading(true);
        setError(null);
        apiClient.get(`${portfolioId}/diversification`)
            .then(response => {
                if (response.data && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
                    if (response.data.amountByCountry || response.data.amountBySector || response.data.amountByIndustry || response.data.amountByStock) {
                        setDiversification(response.data);
                    } else {
                        setDiversification({});
                    }
                } else {
                    setDiversification({});
                }
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching diversification:', error);
                setError(error);
                setDiversification(null);
                setLoading(false);
            });
    }, [portfolioId]);

    useEffect(() => {
        fetchDiversification();
    }, [fetchDiversification]);

    const onPieByCountryEnter = (_, index) => setActiveIndexByCountry(index);
    const onPieBySectorEnter = (_, index) => setActiveIndexBySector(index);
    const onPieByIndustryEnter = (_, index) => setActiveIndexByIndustry(index);
    const onPieByStockEnter = (_, index) => setActiveIndexByStock(index);


    const renderContent = () => {
        if (loading) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (error) {
            return (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Error loading diversification data: {error.message || 'An unknown error occurred.'}
                </Alert>
            );
        }

        if (!diversification || Object.keys(diversification).length === 0) {
            return (
                <Alert severity="info" sx={{ mt: 2 }}>
                    No diversification data available for this portfolio.
                </Alert>
            );
        }

        const pieChartAmountByCountryData = Object.entries(diversification.amountByCountry || {}).map(([name, amount]) => ({
            name,
            amount: typeof amount === 'number' ? parseFloat(amount.toFixed(2)) : 0 // Ensure amount is number
        }));
        const pieChartAmountBySectorData = Object.entries(diversification.amountBySector || {}).map(([name, amount]) => ({
            name,
            amount: typeof amount === 'number' ? parseFloat(amount.toFixed(2)) : 0
        }));
        const pieChartAmountByIndustryData = Object.entries(diversification.amountByIndustry || {}).map(([name, amount]) => ({
            name,
            amount: typeof amount === 'number' ? parseFloat(amount.toFixed(2)) : 0
        }));
        const pieChartAmountByStockData = Object.entries(diversification.amountByStock || {}).map(([name, amount]) => ({
            name,
            amount: typeof amount === 'number' ? parseFloat(amount.toFixed(2)) : 0
        }));

        const renderPieChartCard = (title, data, activeIndex, onMouseEnter) => {
            if (!data || data.length === 0) {
                return (
                    <Grid item xs={12} sm={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>{title}</Typography>
                                <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography color="text.secondary">No data available</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                );
            }
            return (
                <Grid item xs={12} sm={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>{title}</Typography>
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        activeIndex={activeIndex}
                                        activeShape={renderActiveShape}
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="amount"
                                        nameKey="name"
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={() => onMouseEnter(null, -1)}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            );
        };

        return (
            <>
                <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                    Portfolio Diversification
                </Typography>
                <Grid container spacing={3} sx={{ mt: 0 }}>
                    {renderPieChartCard("By Country", pieChartAmountByCountryData, activeIndexByCountry, onPieByCountryEnter)}
                    {renderPieChartCard("By Sector", pieChartAmountBySectorData, activeIndexBySector, onPieBySectorEnter)}
                    {renderPieChartCard("By Industry", pieChartAmountByIndustryData, activeIndexByIndustry, onPieByIndustryEnter)}
                    {renderPieChartCard("By Stock", pieChartAmountByStockData, activeIndexByStock, onPieByStockEnter)}
                </Grid>
            </>
        );
    };


    // --- Main Return Structure ---
    return (
        <Box sx={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Navigation Links - Always Visible */}
            <Container sx={{ mt: 4 }}>
                <NavigationLinks />
            </Container>
            <Container sx={{ mt: 2 }}>
                {renderContent()}
            </Container>
        </Box>
    );
};

export default Diversification;