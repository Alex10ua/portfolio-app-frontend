import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StockTooltip, DividendsByMonthTooltip, DividendsByQuarterTooltip, DividendsByYearTooltip } from '../components/Tooltips';
import apiClient from '../api/api';
import { Assessment as AssessmentIcon, TrendingUp as TrendingUpIcon, CalendarToday as CalendarIcon, AccessTime as TimeIcon } from '@mui/icons-material';


const Dividends = () => {
    const { portfolioId } = useParams();
    const [dividends, setDividends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDividends = useCallback(() => {
        apiClient.get(`${portfolioId}/dividends`)
            .then(response => {
                setDividends(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching dividends:', error);
                setError(error);
                setDividends(null);
                setLoading(false);
            });
    }, [portfolioId]);

    useEffect(() => {
        fetchDividends();
    }, [fetchDividends]);

    const renderDividendContent = () => {

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
                            <h3 className="text-sm font-medium text-red-800">Error loading dividends</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error.message || 'An unknown error occurred.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (!dividends || typeof dividends !== 'object' || Object.keys(dividends).length === 0) {
            return (
                <div className="mt-6 text-center rounded-lg border-2 border-dashed border-slate-300 p-12">
                    <AssessmentIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">No dividend data</h3>
                    <p className="mt-1 text-sm text-slate-500">Dividend data is not available or is in an unexpected format.</p>
                </div>
            );
        }

        const yearlyCombineDividendsProjection = dividends.yearlyCombineDividendsProjection || 0;
        const monthlyDividendsAverage = yearlyCombineDividendsProjection / 12;
        const dailyDividendsAverage = yearlyCombineDividendsProjection / 365;
        const hourlyDividendsAverage = dailyDividendsAverage / 24;

        const amountByMonth = dividends.amountByMonth || {};
        const tickerAmountArray = dividends.tickerAmount || [];

        const barChartAmountByYearData = Object.entries(amountByMonth)
            .map(([month, amount]) => {
                const date = new Date(month);
                const year = date.getFullYear();
                return {
                    year,
                    amount: parseFloat(amount) || 0
                };
            })
            .reduce((acc, { year, amount }) => {
                if (!acc[year])
                    acc[year] = 0;
                acc[year] += amount;
                return acc;
            }, {});

        const barChartAmountByYearArray = Object.entries(barChartAmountByYearData)
            .map(([year, amount]) => ({
                year,
                amount: parseFloat(amount.toFixed(2))
            }))
            .sort((a, b) => a.year - b.year);

        const barChartAmountByQuarterData = Object.entries(amountByMonth)
            .map(([month, amount]) => {
                const date = new Date(month);
                const year = date.getFullYear();
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                return {
                    yearQuarter: `${year} Q${quarter}`,
                    amount: parseFloat(amount) || 0
                };
            })
            .reduce((acc, { yearQuarter, amount }) => {
                if (!acc[yearQuarter]) acc[yearQuarter] = 0;
                acc[yearQuarter] += amount;
                return acc;
            }, {});

        const barChartAmountByQuarterArray = Object.entries(barChartAmountByQuarterData)
            .map(([yearQuarter, amount]) => ({
                yearQuarter,
                amount: parseFloat(amount.toFixed(2))
            }))
            .sort((a, b) => a.yearQuarter.localeCompare(b.yearQuarter));

        const barChartAmountByMonthdata = Object.entries(amountByMonth)
            .map(([month, amount]) => ({
                month,
                amount: parseFloat(amount.toFixed(2)) || 0
            }))
            .sort((a, b) => new Date(a.month) - new Date(b.month));

        const tickerAmountObject = tickerAmountArray.reduce((acc, obj) => ({ ...acc, ...obj }), {});
        const barChartAllDivByStockdata = Object.entries(tickerAmountObject)
            .map(([ticker, amount]) => ({
                ticker,
                amount: parseFloat(amount.toFixed(2)) || 0
            }))
            .sort((a, b) => b.amount - a.amount);


        return (
            <div className="space-y-6">
                {/* Projections Section */}
                <div>
                    <h2 className="text-lg font-medium leading-6 text-slate-900 mb-4">Stock Dividends Projection</h2>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6">
                            <dt>
                                <div className="absolute rounded-md bg-indigo-500 p-3">
                                    <TrendingUpIcon className="h-6 w-6 text-white" aria-hidden="true" />
                                </div>
                                <p className="ml-16 truncate text-sm font-medium text-slate-500">Yearly Projection</p>
                            </dt>
                            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                                <p className="text-2xl font-semibold text-slate-900">${yearlyCombineDividendsProjection.toFixed(2)}</p>
                            </dd>
                        </div>
                        <div className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6">
                            <dt>
                                <div className="absolute rounded-md bg-indigo-500 p-3">
                                    <CalendarIcon className="h-6 w-6 text-white" aria-hidden="true" />
                                </div>
                                <p className="ml-16 truncate text-sm font-medium text-slate-500">Monthly Average</p>
                            </dt>
                            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                                <p className="text-2xl font-semibold text-slate-900">${monthlyDividendsAverage.toFixed(2)}</p>
                            </dd>
                        </div>
                        <div className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6">
                            <dt>
                                <div className="absolute rounded-md bg-indigo-500 p-3">
                                    <CalendarIcon className="h-6 w-6 text-white" aria-hidden="true" />
                                </div>
                                <p className="ml-16 truncate text-sm font-medium text-slate-500">Daily Average</p>
                            </dt>
                            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                                <p className="text-2xl font-semibold text-slate-900">${dailyDividendsAverage.toFixed(2)}</p>
                            </dd>
                        </div>
                        <div className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6">
                            <dt>
                                <div className="absolute rounded-md bg-indigo-500 p-3">
                                    <TimeIcon className="h-6 w-6 text-white" aria-hidden="true" />
                                </div>
                                <p className="ml-16 truncate text-sm font-medium text-slate-500">Hourly Average</p>
                            </dt>
                            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                                <p className="text-2xl font-semibold text-slate-900">${hourlyDividendsAverage.toFixed(2)}</p>
                            </dd>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-200 pt-6"></div>

                {/* Charts Section */}
                <div>
                    <h2 className="text-lg font-medium leading-6 text-slate-900 mb-4">Dividends Analysis</h2>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Chart: Dividends By Year */}
                        {barChartAmountByYearArray.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-base font-semibold text-slate-900 mb-4">Dividends By Year</h3>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barChartAmountByYearArray}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="year" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                            <Tooltip content={<DividendsByYearTooltip />} cursor={{ fill: 'transparent' }} />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} name="Amount ($)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Chart: Dividends By Quarter */}
                        {barChartAmountByQuarterArray.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-base font-semibold text-slate-900 mb-4">Dividends By Quarter</h3>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barChartAmountByQuarterArray}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="yearQuarter" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                            <Tooltip content={<DividendsByQuarterTooltip />} cursor={{ fill: 'transparent' }} />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Amount ($)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Chart: Dividends By Month */}
                        {barChartAmountByMonthdata.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                                <h3 className="text-base font-semibold text-slate-900 mb-4">Dividends By Month</h3>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barChartAmountByMonthdata}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                            <Tooltip content={<DividendsByMonthTooltip />} cursor={{ fill: 'transparent' }} />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="amount" fill="#ec4899" radius={[4, 4, 0, 0]} name="Amount ($)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Chart: All Time Dividends By Stock */}
                        {barChartAllDivByStockdata.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                                <h3 className="text-base font-semibold text-slate-900 mb-4">All Time Dividends By Stock</h3>
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barChartAllDivByStockdata}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="ticker" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                            <Tooltip content={<StockTooltip />} cursor={{ fill: 'transparent' }} />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Amount ($)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderDividendContent()}
        </div>
    );
};

export default Dividends;