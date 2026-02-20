import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { PieChart, Pie, Sector, ResponsiveContainer } from 'recharts';
import apiClient from '../api/api';
import { PieChart as PieChartIcon } from '@mui/icons-material';

const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, name, amount } = props;
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
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-sm font-medium">
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
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" className="text-xs">{`${displayName}`}</text>
            {typeof percent === 'number' && (
                <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" className="text-xs">
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
    const [activeIndexByCountry, setActiveIndexByCountry] = useState(0);
    const [activeIndexBySector, setActiveIndexBySector] = useState(0);
    const [activeIndexByIndustry, setActiveIndexByIndustry] = useState(0);
    const [activeIndexByStock, setActiveIndexByStock] = useState(0);

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
                <div className="flex h-64 items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="rounded-md bg-red-50 p-4 mt-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error loading diversification data</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error.message || 'An unknown error occurred.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (!diversification || Object.keys(diversification).length === 0) {
            return (
                <div className="mt-6 text-center rounded-lg border-2 border-dashed border-slate-300 p-12">
                    <PieChartIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">No diversification data</h3>
                    <p className="mt-1 text-sm text-slate-500">Diversification data is not available for this portfolio.</p>
                </div>
            );
        }

        const pieChartAmountByCountryData = Object.entries(diversification.amountByCountry || {}).map(([name, amount]) => ({
            name,
            amount: typeof amount === 'number' ? parseFloat(amount.toFixed(2)) : 0
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
                    <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">{title}</h3>
                        <div className="h-96 flex items-center justify-center text-slate-400">
                            No data available
                        </div>
                    </div>
                );
            }
            return (
                <div className="bg-white overflow-hidden shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">{title}</h3>
                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    activeIndex={activeIndex}
                                    activeShape={renderActiveShape}
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    fill="#6366f1"
                                    dataKey="amount"
                                    nameKey="name"
                                    onMouseEnter={onMouseEnter}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        };

        return (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
                {renderPieChartCard("By Country", pieChartAmountByCountryData, activeIndexByCountry, onPieByCountryEnter)}
                {renderPieChartCard("By Sector", pieChartAmountBySectorData, activeIndexBySector, onPieBySectorEnter)}
                {renderPieChartCard("By Industry", pieChartAmountByIndustryData, activeIndexByIndustry, onPieByIndustryEnter)}
                {renderPieChartCard("By Stock", pieChartAmountByStockData, activeIndexByStock, onPieByStockEnter)}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold leading-7 text-slate-900 sm:text-3xl sm:truncate">
                Portfolio Diversification
            </h1>
            {renderContent()}
        </div>
    );
};

export default Diversification;