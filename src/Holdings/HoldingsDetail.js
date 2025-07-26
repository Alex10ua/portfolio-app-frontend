import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../Holdings/HoldingDetalis.css';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';

import CreateTransactionDialog from '../components/CreateTransactionDialog'; // Import the new component
import StackedAreaChart from '../components/StackedAreaChart'; //Import StackedAreaChart
import apiClient from '../api/api';

//https://recharts.org/en-US/examples/StackedAreaChart
function HoldingsDetail() {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState(null);
  const [transaction, setTransaction] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const chartColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']; // Colors for StackedAreaChart
  const [tableConfigDialogOpen, setTableConfigDialogOpen] = useState(false);
  const [tableConfig, setTableConfig] = useState({
    columns: [
      { key: 'ticker', label: 'Holding', visible: true },
      { key: 'shareAmount', label: 'Shares', visible: true },
      { key: 'costPerShare', label: 'Cost per Share', visible: true },
      { key: 'currentShareValue', label: 'Current Total Value', visible: true },
      { key: 'dividend', label: 'Dividends', visible: true },
      { key: 'dividendYield', label: 'Dividend Yield', visible: true },
      { key: 'dividendYieldOnCost', label: 'Dividend Yield On Cost', visible: true },
      { key: 'totalProfit', label: 'Total Profit', visible: true },
      { key: 'dailyChange', label: 'Daily Change', visible: true },
    ],
    orderBy: 'ticker', // Default sorting column
    order: 'asc', // Default sorting order
  });

  // Sample data for StackedAreaChart
  const data = [
    {
      month: '2025.Jan',
      'Deposit(usd)': 4000,
      valueMarket: 2400,
      CashAvaible: 2400,
      dividend: 200,
    },
    {
      month: '2025.Feb',
      'Deposit(usd)': 3000,
      valueMarket: 1398,
      CashAvaible: 2210,
      dividend: 200,
    },
    {
      month: '2025.Mar',
      'Deposit(usd)': 1200,
      valueMarket: 9800,
      CashAvaible: 2290,
      dividend: 200,
    },
    {
      month: '2025.Apr',
      'Deposit(usd)': 1000,
      valueMarket: 9900,
      CashAvaible: 2190,
      dividend: 200,
    },
    {
      month: '2025.May',
      'Deposit(usd)': 1500,
      valueMarket: 9900,
      CashAvaible: 2190,
      dividend: 200,
    },
  ];
  //Example of areas for StackedAreaChart
  const areas = [
    { dataKey: 'Deposit(usd)', name: 'Deposit (USD)' },
    { dataKey: 'valueMarket', name: 'Market Value' },
    { dataKey: 'CashAvaible', name: 'Available Cash' },
    { dataKey: 'dividend', name: 'Recieved Dividends' },
  ];

  // Function to fetch holdings data
  // Use useCallback to memoize fetchHoldings
  const fetchHoldingsList = useCallback(() => {
    apiClient
      .get(`${portfolioId}`)
      .then((response) => {
        // Make a mutable copy of the data to sort
        const dataToSort = [...response.data];

        // Sort the data
        const sortedData = dataToSort.sort((a, b) => {
          let valA, valB;

          // Special handling for 'currentShareValue' to sort by calculated total value
          if (tableConfig.orderBy === 'currentShareValue') {
            // Ensure 'currentShareValue' and 'shareAmount' are numbers, default to 0 if not or if null
            const aCurrentShareValue = typeof a.currentShareValue === 'number' && a.currentShareValue !== null ? a.currentShareValue : 0;
            const aShareAmount = typeof a.shareAmount === 'number' && a.shareAmount !== null ? a.shareAmount : 0;
            const bCurrentShareValue = typeof b.currentShareValue === 'number' && b.currentShareValue !== null ? b.currentShareValue : 0;
            const bShareAmount = typeof b.shareAmount === 'number' && b.shareAmount !== null ? b.shareAmount : 0;

            valA = aCurrentShareValue * aShareAmount;
            valB = bCurrentShareValue * bShareAmount;
          } else {
            // Generic way to get values for other columns
            valA = a[tableConfig.orderBy];
            valB = b[tableConfig.orderBy];
          }

          // Handle potential null/undefined values after potentially calculating them or fetching them
          if (valA == null && valB == null) return 0;
          if (valA == null) return tableConfig.order === 'asc' ? -1 : 1; // Nulls first in asc, last in desc
          if (valB == null) return tableConfig.order === 'asc' ? 1 : -1; // Nulls first in asc, last in desc

          // Type-specific comparison
          if (typeof valA === 'number' && typeof valB === 'number') {
            return tableConfig.order === 'asc' ? valA - valB : valB - valA;
          } else if (typeof valA === 'string' && typeof valB === 'string') {
            const comparison = valA.localeCompare(valB);
            return tableConfig.order === 'asc' ? comparison : -comparison;
          } else {
            // Fallback for mixed types or other types (original logic)
            // This might need adjustment if you have other specific types to sort
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
  }, [fetchFirstTradeYear]);

  const handleSortRequest = (property) => {
    const isAsc = tableConfig.orderBy === property && tableConfig.order === 'asc';
    setTableConfig((prevConfig) => ({
      ...prevConfig,
      orderBy: property,
      order: isAsc ? 'desc' : 'asc',
    }));
  };

  // Toggle column visibility in the config
  const handleToggleColumn = (columnKey) => {
    setTableConfig((prevConfig) => ({
      ...prevConfig,
      columns: prevConfig.columns.map((col) =>
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      ),
    }));
  };

  // Open and close the config dialog
  const handleOpenConfigDialog = () => setTableConfigDialogOpen(true);
  const handleCloseConfigDialog = () => setTableConfigDialogOpen(false);

  useEffect(() => {
    fetchHoldingsList();
  }, [fetchHoldingsList]);

  // Function to handle dialog open
  const handleClickOpen = () => {
    setOpen(true);
  };

  // Function to handle dialog close
  const handleClose = () => {
    setOpen(false);
  };

  const handleCreateTransaction = async (newTransaction) => {
    setLoading(true);
    try {
      await apiClient
        .post(
          `${portfolioId}/createTransaction`,
          newTransaction
        )
        .then((response) => {
          setTransaction([...transaction, response.data]); // Add new transaction to the list
          fetchHoldingsList(); // Refresh holdings data
          handleClose(); // Close the dialog
        })
        .catch((error) => {
          console.error('Error creating transaction:', error);
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

  if (loading) {
    return (
      <Box
        display='flex'
        flexDirection='column'
        alignItems='center'
        justifyContent='center'
        height='100vh'
      >
        <CircularProgress />
        <p>Loading holdings...</p>
      </Box>
    );
  }
  if (error) return <p>Error loading holdings: {error.message}</p>;
  if (!holdings) return <p>Holdings not found.</p>;

  return (
    <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant='contained'
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{
            alignSelf: 'flex-start',
            backgroundColor: 'primary.main',
            color: 'white',
            padding: '8px 24px',
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            '&:hover': {
              backgroundColor: 'primary.dark',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Back to Portfolios
        </Button>
        <Typography variant='h4' component='h1'>
          {holdings.name}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant='outlined'
          onClick={handleOpenConfigDialog}
          sx={{
            marginRight: '1rem',
          }}
        >
          Modify Table Config
        </Button>
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            padding: '10px 24px',
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            '&:hover': {
              backgroundColor: 'primary.dark',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Create New Transaction
        </Button>
      </Box>

      <CreateTransactionDialog
        open={open}
        onClose={handleClose}
        onCreateTransaction={handleCreateTransaction}
      />

      
      <StackedAreaChart
        data={data}
        xAxisKey='month'
        areas={areas}
        colors={chartColors}
      />
      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          mt: 3,
          mb: 3,
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '& .MuiTable-root': {
            minWidth: 650,
          },
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              {/* Table Head remains the same - filters based on visible */}
              {tableConfig.columns
                .filter((column) => column.visible)
                .map((column) => (
                  <TableCell
                    key={column.key}
                    sortDirection={tableConfig.orderBy === column.key ? tableConfig.order : false}
                  >
                    <TableSortLabel
                      active={tableConfig.orderBy === column.key}
                      direction={tableConfig.orderBy === column.key ? tableConfig.order : 'asc'}
                      onClick={() => handleSortRequest(column.key)}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody
            sx={{
              '& tr:nth-of-type(odd)': {
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
              },
              '& tr:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                transition: 'background-color 0.2s ease',
              },
              '& td': {
                padding: '16px',
                fontSize: '0.875rem',
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
              },
            }}
          >
            {/* Iterate through holdings data */}
            {holdings.map((holding, index) => (
              // Use a more stable key if holding has an ID, otherwise fallback to index
              <TableRow key={holding.id || holding.ticker || index}>
                {/* Iterate through the columns defined in config */}
                {tableConfig.columns.map((column) => {
                  // Only render the TableCell if the column is marked as visible
                  if (!column.visible) {
                    return null; // Skip rendering this cell
                  }

                  // Use a switch statement to render content based on column key
                  // This preserves specific formatting and logic for each cell type
                  let cellContent = null;
                  const cellProps = {}; // To hold specific props like sx, title, align

                  // Helper for safe number formatting
                  const formatCurrency = (value) => value?.toFixed(2) ?? 'N/A';
                  const formatPercent = (value) => value?.toFixed(2) ?? 'N/A';

                  switch (column.key) {
                    case 'ticker':
                      cellContent = (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <img
                            src={`/images/${holding.ticker}_icon.png`}
                            alt={holding.ticker}
                            style={{ width: 24, height: 24, marginRight: 10 }}
                            // Optional: Add error handling for missing images
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <Typography>{holding.ticker}</Typography>
                        </Box>
                      );
                      break;
                    case 'shareAmount':
                      cellContent = holding.shareAmount;
                      break;
                    case 'costPerShare':
                      cellContent = `$${formatCurrency(holding.costPerShare)}`;
                      break;
                    case 'currentShareValue': // Represents 'Current Total Value' column
                      const totalValue = holding.currentShareValue * holding.shareAmount;
                      cellContent = `$${formatCurrency(totalValue)}`;
                      // Add the title attribute back
                      cellProps.title = `Share price: $${formatCurrency(holding.currentShareValue)}`;
                      break;
                    case 'dividend': // Represents 'Dividends' column (total)
                      const totalDividend = holding.dividend * holding.shareAmount;
                      cellContent = `$${formatCurrency(totalDividend)}`;
                      // Add the title attribute back
                      cellProps.title = `$${formatCurrency(holding.dividend)} per share`;
                      break;
                    case 'dividendYield':
                      cellContent = `${formatPercent(holding.dividendYield)}%`;
                      break;
                    case 'dividendYieldOnCost':
                      cellContent = `${formatPercent(holding.dividendYieldOnCost)}%`;
                      break;
                    case 'totalProfit':
                      const profit = holding.totalProfit;
                      const profitPercentage = holding.totalProfitPercentage;
                      cellContent = `$${formatCurrency(profit)} (${formatPercent(profitPercentage)}%)`;
                      // Apply conditional styling
                      cellProps.sx = { color: profit > 0 ? 'green' : 'red' };
                      break;
                    case 'dailyChange':
                      const change = holding.dailyChange;
                      cellContent = `$${formatCurrency(change)}`;
                      // Apply conditional styling
                      cellProps.sx = { color: change > 0 ? 'green' : 'red' };
                      break;
                    default:
                      // Fallback for any unexpected column keys
                      cellContent = holding[column.key]?.toString() ?? 'N/A';
                  }

                  // Render the TableCell with its determined content and props
                  return (
                    <TableCell key={column.key} {...cellProps}>
                      {cellContent}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer >

      {/* Table Config Dialog */}
      <Dialog Dialog open={tableConfigDialogOpen} onClose={handleCloseConfigDialog} >
        <DialogTitle>Modify Table Configuration</DialogTitle>
        <DialogContent>
          {tableConfig.columns.map((column) => (
            <FormControlLabel
              key={column.key}
              control={
                <Checkbox
                  checked={column.visible}
                  onChange={() => handleToggleColumn(column.key)}
                />
              }
              label={column.label}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfigDialog}>Close</Button>
        </DialogActions>
      </Dialog >
    </Box >
  );
}

export default HoldingsDetail;
