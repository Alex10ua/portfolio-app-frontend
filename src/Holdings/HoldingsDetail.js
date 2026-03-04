import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Button
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  Settings as SettingsIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon
} from '@mui/icons-material';

import CreateTransactionDialog from '../components/CreateTransactionDialog';
import StackedAreaChart from '../components/StackedAreaChart';
import apiClient from '../api/api';
import ImportTransactionsModal from './ImportTransactionsModal';

function HoldingsDetail() {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState(null);
  const [transaction, setTransaction] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const chartColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const [tableConfigDialogOpen, setTableConfigDialogOpen] = useState(false);
  const [tableConfig, setTableConfig] = useState({
    columns: [
      { key: 'ticker', label: 'Holding', visible: true },
      { key: 'shareAmount', label: 'Shares', visible: true },
      { key: 'costPerShare', label: 'Cost/Share', visible: true },
      { key: 'currentShareValue', label: 'Total Value', visible: true },
      { key: 'dividend', label: 'Dividends', visible: true },
      { key: 'dividendYield', label: 'Yield', visible: true },
      { key: 'dividendYieldOnCost', label: 'Yield on Cost', visible: true },
      { key: 'totalProfit', label: 'Total Profit', visible: true },
      { key: 'dailyChange', label: 'Daily Change', visible: true },
    ],
    orderBy: 'ticker',
    order: 'asc',
  });

  const data = [
    { month: '2025.Jan', 'Deposit(usd)': 4000, valueMarket: 2400, CashAvaible: 2400, dividend: 200 },
    { month: '2025.Feb', 'Deposit(usd)': 3000, valueMarket: 1398, CashAvaible: 2210, dividend: 200 },
    { month: '2025.Mar', 'Deposit(usd)': 1200, valueMarket: 9800, CashAvaible: 2290, dividend: 200 },
    { month: '2025.Apr', 'Deposit(usd)': 1000, valueMarket: 9900, CashAvaible: 2190, dividend: 200 },
    { month: '2025.May', 'Deposit(usd)': 1500, valueMarket: 9900, CashAvaible: 2190, dividend: 200 },
  ];

  const areas = [
    { dataKey: 'Deposit(usd)', name: 'Deposit (USD)' },
    { dataKey: 'valueMarket', name: 'Market Value' },
    { dataKey: 'CashAvaible', name: 'Available Cash' },
    { dataKey: 'dividend', name: 'Received Dividends' },
  ];

  const fetchHoldingsList = useCallback(() => {
    apiClient
      .get(`${portfolioId}`)
      .then((response) => {
        // Prevent silent crash by ensuring data is strictly an array before slicing/sorting
        const dataToSort = Array.isArray(response.data) ? [...response.data] : [];
        const sortedData = dataToSort.sort((a, b) => {
          let valA, valB;

          if (tableConfig.orderBy === 'currentShareValue') {
            const aCurrentShareValue = typeof a.currentShareValue === 'number' && a.currentShareValue !== null ? a.currentShareValue : 0;
            const aShareAmount = typeof a.shareAmount === 'number' && a.shareAmount !== null ? a.shareAmount : 0;
            const bCurrentShareValue = typeof b.currentShareValue === 'number' && b.currentShareValue !== null ? b.currentShareValue : 0;
            const bShareAmount = typeof b.shareAmount === 'number' && b.shareAmount !== null ? b.shareAmount : 0;
            valA = aCurrentShareValue * aShareAmount;
            valB = bCurrentShareValue * bShareAmount;
          } else {
            valA = a[tableConfig.orderBy];
            valB = b[tableConfig.orderBy];
          }

          if (valA == null && valB == null) return 0;
          if (valA == null) return tableConfig.order === 'asc' ? -1 : 1;
          if (valB == null) return tableConfig.order === 'asc' ? 1 : -1;

          if (typeof valA === 'number' && typeof valB === 'number') {
            return tableConfig.order === 'asc' ? valA - valB : valB - valA;
          } else if (typeof valA === 'string' && typeof valB === 'string') {
            const comparison = valA.localeCompare(valB);
            return tableConfig.order === 'asc' ? comparison : -comparison;
          } else {
            if (tableConfig.order === 'asc') {
              return valA > valB ? 1 : valA < valB ? -1 : 0;
            } else {
              return valA < valB ? 1 : valA > valB ? -1 : 0;
            }
          }
        });
        setHoldings(sortedData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching holdings details:', error);
        setError(error);
        setLoading(false);
      });
  }, [portfolioId, tableConfig.orderBy, tableConfig.order]);

  const fetchFirstTradeYear = useCallback(() => {
    apiClient.get(`${portfolioId}/firstTradeYear`)
      .then(response => {
        const firstTradeYear = response.data.firstTradeYear;
        if (firstTradeYear) {
          localStorage.setItem('firstTradeYear', firstTradeYear);
        }
      })
      .catch(error => {
        console.error('Error fetching first trade year:', error);
      });
  }, [portfolioId]);

  useEffect(() => {
    fetchFirstTradeYear();
    fetchHoldingsList();
  }, [fetchFirstTradeYear, fetchHoldingsList]);

  const handleSortRequest = (property) => {
    const isAsc = tableConfig.orderBy === property && tableConfig.order === 'asc';
    setTableConfig((prevConfig) => ({
      ...prevConfig,
      orderBy: property,
      order: isAsc ? 'desc' : 'asc',
    }));
  };

  const handleToggleColumn = (columnKey) => {
    setTableConfig((prevConfig) => ({
      ...prevConfig,
      columns: prevConfig.columns.map((col) =>
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      ),
    }));
  };

  const handleOpenConfigDialog = () => setTableConfigDialogOpen(true);
  const handleCloseConfigDialog = () => setTableConfigDialogOpen(false);
  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleCreateTransaction = async (newTransaction) => {
    setLoading(true);
    try {
      await apiClient.post(`${portfolioId}/createTransaction`, newTransaction)
        .then((response) => {
          setTransaction([...transaction, response.data]);
          fetchHoldingsList();
          handleClose();
        });
    } catch (error) {
      console.error('Transaction failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedConfig = localStorage.getItem(`tableConfig-${portfolioId}`);
    if (savedConfig) {
      setTableConfig(JSON.parse(savedConfig));
    }
  }, [portfolioId]);

  useEffect(() => {
    localStorage.setItem(`tableConfig-${portfolioId}`, JSON.stringify(tableConfig));
  }, [portfolioId, tableConfig]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
  if (error) return <div className="text-red-500 p-4">Error loading holdings: {error.message}</div>;
  if (!holdings) return <div className="p-4">Holdings not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
          >
            <ArrowBackIcon className="h-4 w-4 mr-1" />
            Back to Portfolios
          </button>
          <h1 className="text-3xl font-bold text-slate-900">{holdings.name || 'Portfolio Holdings'}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleOpenConfigDialog}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            <SettingsIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-slate-400" />
            Columns
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            <CloudUploadIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-slate-400" />
            Import
          </button>
          <button
            onClick={handleClickOpen}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <AddIcon className="-ml-0.5 mr-1.5 h-5 w-5" />
            New Transaction
          </button>
        </div>
      </div>

      <CreateTransactionDialog
        open={open}
        onClose={handleClose}
        onCreateTransaction={handleCreateTransaction}
      />

      <ImportTransactionsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        portfolioId={portfolioId}
        onImportSuccess={fetchHoldingsList}
      />

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Portfolio Performance</h2>
        <div className="h-[400px] w-full">
          <StackedAreaChart
            data={data}
            xAxisKey='month'
            areas={areas}
            colors={chartColors}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {tableConfig.columns.filter((col) => col.visible).map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => handleSortRequest(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {tableConfig.orderBy === column.key && (
                        <span className="text-indigo-600">
                          {tableConfig.order === 'asc' ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {holdings.map((holding, index) => (
                <tr key={holding.id || holding.ticker || index} className="hover:bg-slate-50 transition-colors">
                  {tableConfig.columns.filter((col) => col.visible).map((column) => {
                    let cellContent = null;
                    let cellClass = "px-6 py-4 whitespace-nowrap text-sm text-slate-700";

                    const formatCurrency = (value) => value?.toFixed(2) ?? 'N/A';
                    const formatPercent = (value) => value?.toFixed(2) ?? 'N/A';

                    switch (column.key) {
                      case 'ticker':
                        cellContent = (
                          <div className="flex items-center">
                            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                              {/* Placeholder for logo if image fails */}
                              <span className="text-xs font-bold text-slate-500">{holding.ticker.substring(0, 2)}</span>
                            </div>
                            <div className="font-medium text-slate-900">{holding.ticker}</div>
                          </div>
                        );
                        break;
                      case 'costPerShare':
                        cellContent = `$${formatCurrency(holding.costPerShare)}`;
                        break;
                      case 'currentShareValue':
                        const totalValue = holding.currentShareValue * holding.shareAmount;
                        cellContent = (
                          <div>
                            <div className="font-medium text-slate-900">${formatCurrency(totalValue)}</div>
                            <div className="text-xs text-slate-500">Price: ${formatCurrency(holding.currentShareValue)}</div>
                          </div>
                        );
                        break;
                      case 'dividend':
                        const totalDividend = holding.dividend * holding.shareAmount;
                        cellContent = `$${formatCurrency(totalDividend)}`;
                        break;
                      case 'dividendYield':
                        cellContent = <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">{formatPercent(holding.dividendYield)}%</span>;
                        break;
                      case 'dividendYieldOnCost':
                        cellContent = `${formatPercent(holding.dividendYieldOnCost)}%`;
                        break;
                      case 'totalProfit':
                        const profit = holding.totalProfit;
                        const profitPercentage = holding.totalProfitPercentage;
                        const isProfitable = profit >= 0;
                        cellClass += isProfitable ? " text-green-600" : " text-red-600";
                        cellContent = (
                          <div>
                            <span className="font-medium">${formatCurrency(profit)}</span>
                            <span className="ml-1 text-xs">({formatPercent(profitPercentage)}%)</span>
                          </div>
                        );
                        break;
                      case 'dailyChange':
                        const change = holding.dailyChange;
                        const isPositive = change >= 0;
                        cellClass += isPositive ? " text-green-600" : " text-red-600";
                        cellContent = `$${formatCurrency(change)}`;
                        break;
                      default:
                        cellContent = holding[column.key]?.toString() ?? 'N/A';
                    }

                    return (
                      <td key={column.key} className={cellClass}>
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={tableConfigDialogOpen} onClose={handleCloseConfigDialog}>
        <DialogTitle className="font-bold">Column Configuration</DialogTitle>
        <DialogContent dividers>
          <div className="flex flex-col gap-2">
            {tableConfig.columns.map((column) => (
              <FormControlLabel
                key={column.key}
                control={
                  <Checkbox
                    checked={column.visible}
                    onChange={() => handleToggleColumn(column.key)}
                    color="primary"
                  />
                }
                label={<span className="text-sm text-slate-700">{column.label}</span>}
              />
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfigDialog} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default HoldingsDetail;
