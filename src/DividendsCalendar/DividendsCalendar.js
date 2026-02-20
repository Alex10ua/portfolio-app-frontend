import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/api';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';

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
                            <h3 className="text-sm font-medium text-red-800">Error fetching dividend data</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error.message || 'An unknown error occurred.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (!dividendsCalendar || Object.keys(dividendsCalendar).length === 0) {
            return (
                <div className="mt-6 text-center rounded-lg border-2 border-dashed border-slate-300 p-12">
                    <CalendarIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">No dividend calendar</h3>
                    <p className="mt-1 text-sm text-slate-500">Dividend calendar data is not available.</p>
                </div>
            );
        }

        return (
            <div className="mt-6 space-y-8">
                {Object.keys(dividendsCalendar).map((month) => {
                    const monthDividends = dividendsCalendar[month];
                    const totalMonthDividends = Array.isArray(monthDividends)
                        ? monthDividends.reduce((total, dividend) => {
                            const amount = typeof dividend.dividendAmount === 'number' ? dividend.dividendAmount : 0;
                            const quantity = typeof dividend.stockQuantity === 'number' ? dividend.stockQuantity : 0;
                            return total + (amount * quantity);
                        }, 0).toFixed(2)
                        : '0.00';

                    return (
                        <div key={month} className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="border-b border-gray-200 px-4 py-5 sm:px-6 flex justify-between items-center bg-gray-50">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    {month}
                                </h3>
                                <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    Total: ${totalMonthDividends}
                                </span>
                            </div>
                            <div className="px-4 py-5 sm:p-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {Array.isArray(monthDividends) &&
                                        monthDividends.map((dividend, index) => {
                                            const { ticker = 'N/A', dividendAmount = 0, stockQuantity = 0 } = dividend;
                                            const totalDividend = (dividendAmount * stockQuantity).toFixed(2);

                                            return (
                                                <div key={`${ticker}-${index}`} className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-indigo-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                                    <div className="flex-shrink-0">
                                                        <img
                                                            className="h-10 w-10 rounded-full"
                                                            onError={(e) => { e.target.style.display = 'none'; e.target.onerror = null; }}
                                                            src={`/images/${ticker}_icon.png`}
                                                            alt={ticker}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="focus:outline-none">
                                                            <span className="absolute inset-0" aria-hidden="true" />
                                                            <p className="text-sm font-medium text-gray-900">{ticker}</p>
                                                            <p className="text-sm text-gray-500 truncate">
                                                                {stockQuantity} shares @ ${dividendAmount.toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 text-right">
                                                        <p className="text-sm font-medium text-green-600">${totalDividend}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };


    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate mb-6">
                Dividend Calendar
            </h1>
            {renderContent()}
        </div>
    );
}

export default DividendsCalendar;