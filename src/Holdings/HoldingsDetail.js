import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../Holdings/HoldingDetalis.css';
import axios from 'axios';
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
  IconButton,
  CircularProgress,
  TableSortLabel,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import NavigationLinks from '../components/NavigationLinks';
import CreateTransactionDialog from '../components/CreateTransactionDialog'; // Import the new component
import StackedAreaChart from '../components/StackedAreaChart'; //Import StackedAreaChart
//https://recharts.org/en-US/examples/StackedAreaChart
function HoldingsDetail() {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState(null);
  const [transaction, setTransaction] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [orderBy, setOrderBy] = useState('ticker'); // Default sorting by ticker
  const [order, setOrder] = useState('asc'); // Default order ascending
  const chartColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']; // Colors for StackedAreaChart

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
    axios
      .get(`http://localhost:8080/api/v1/${portfolioId}`)
      .then((response) => {
        // Sort the data
        const sortedData = [...response.data].sort((a, b) => {
          if (order === 'asc') {
            return a[orderBy] > b[orderBy] ? 1 : -1;
          } else {
            return a[orderBy] < b[orderBy] ? 1 : -1;
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
  }, [portfolioId, orderBy, order]);

  const handleSortRequest = (property) => (event) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

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
      await axios
        .post(
          `http://localhost:8080/api/v1/${portfolioId}/createTransaction`,
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

      {/* Navigation Links */}
      <NavigationLinks />
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
              <TableCell
                key='ticker'
                sortDirection={orderBy === 'ticker' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'ticker'}
                  direction={orderBy === 'ticker' ? order : 'asc'}
                  onClick={handleSortRequest('ticker')}
                >
                  Holding
                </TableSortLabel>
              </TableCell>
              <TableCell
                key='shareAmount'
                sortDirection={orderBy === 'shareAmount' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'shareAmount'}
                  direction={orderBy === 'shareAmount' ? order : 'asc'}
                  onClick={handleSortRequest('shareAmount')}
                >
                  Shares
                </TableSortLabel>
              </TableCell>
              <TableCell
                key='costPerShare'
                sortDirection={orderBy === 'costPerShare' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'costPerShare'}
                  direction={orderBy === 'costPerShare' ? order : 'asc'}
                  onClick={handleSortRequest('costPerShare')}
                >
                  Cost per Share
                </TableSortLabel>
              </TableCell>
              <TableCell
                key='currentShareValue'
                sortDirection={orderBy === 'currentShareValue' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'currentShareValue'}
                  direction={orderBy === 'currentShareValue' ? order : 'asc'}
                  onClick={handleSortRequest('currentShareValue')}
                >
                  Current Total Value
                </TableSortLabel>
              </TableCell>
              <TableCell
                key='dividend'
                sortDirection={orderBy === 'dividend' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'dividend'}
                  direction={orderBy === 'dividend' ? order : 'asc'}
                  onClick={handleSortRequest('dividend')}
                >
                  Dividends
                </TableSortLabel>
              </TableCell>
              <TableCell
                key='dividendYield'
                sortDirection={orderBy === 'dividendYield' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'dividendYield'}
                  direction={orderBy === 'dividendYield' ? order : 'asc'}
                  onClick={handleSortRequest('dividendYield')}
                >
                  Dividend Yield
                </TableSortLabel>
              </TableCell>
              <TableCell
                key='dividendYieldOnCost'
                sortDirection={
                  orderBy === 'dividendYieldOnCost' ? order : false
                }
              >
                <TableSortLabel
                  active={orderBy === 'dividendYieldOnCost'}
                  direction={orderBy === 'dividendYieldOnCost' ? order : 'asc'}
                  onClick={handleSortRequest('dividendYieldOnCost')}
                >
                  Dividend Yield On Cost
                </TableSortLabel>
              </TableCell>
              <TableCell
                key='totalProfit'
                sortDirection={orderBy === 'totalProfit' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'totalProfit'}
                  direction={orderBy === 'totalProfit' ? order : 'asc'}
                  onClick={handleSortRequest('totalProfit')}
                >
                  Total Profit
                </TableSortLabel>
              </TableCell>
              <TableCell
                key='dailyChange'
                sortDirection={orderBy === 'dailyChange' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'dailyChange'}
                  direction={orderBy === 'dailyChange' ? order : 'asc'}
                  onClick={handleSortRequest('dailyChange')}
                >
                  Daily Change
                </TableSortLabel>
              </TableCell>
              <TableCell align='center'>Actions</TableCell>
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
            {holdings.map((holding, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <img
                      src={`/images/${holding.ticker}_icon.png`}
                      alt={holding.ticker}
                      style={{ width: 24, height: 24, marginRight: 10 }}
                    />
                    <Typography>{holding.ticker}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{holding.shareAmount}</TableCell>
                <TableCell>${holding.costPerShare}</TableCell>
                <TableCell title={`Share price: $${holding.currentShareValue}`}>
                  $
                  {(holding.currentShareValue * holding.shareAmount).toFixed(2)}
                </TableCell>
                <TableCell title={`$${holding.dividend} per share`}>
                  ${(holding.dividend * holding.shareAmount).toFixed(2)}
                </TableCell>
                <TableCell>{holding.dividendYield}%</TableCell>
                <TableCell>{holding.dividendYieldOnCost}%</TableCell>
                <TableCell
                  sx={{ color: holding.totalProfit > 0 ? 'green' : 'red' }}
                >
                  ${holding.totalProfit} ({holding.totalProfitPercentage}%)
                </TableCell>
                <TableCell
                  sx={{ color: holding.dailyChange > 0 ? 'green' : 'red' }}
                >
                  ${holding.dailyChange}
                </TableCell>
                <TableCell align='center'>
                  <IconButton>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default HoldingsDetail;
