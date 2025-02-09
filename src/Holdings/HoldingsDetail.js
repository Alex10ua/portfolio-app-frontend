import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../Holdings/HoldingDetalis.css';
import axios from 'axios';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Typography, Button, Box, IconButton, TextField,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    FormControl, InputLabel, Select, MenuItem, CircularProgress, TableSortLabel
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import NavigationLinks from '../components/NavigationLinks';
//https://recharts.org/en-US/examples/StackedAreaChart
function HoldingsDetail() {
    const { portfolioId } = useParams();
    const navigate = useNavigate();
    const [holdings, setHoldings] = useState(null);
    const [transaction, setTransaction] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format,
        transactionType: 'BUY', // Default transaction type
        ticker: '',
        quantity: '',
        price: '',
        commission: '',
        currency: 'USD', // Default currency
    });
    const [orderBy, setOrderBy] = useState('ticker'); // Default sorting by ticker
    const [order, setOrder] = useState('asc'); // Default order ascending

    // Function to fetch holdings data
    // Use useCallback to memoize fetchHoldings
    const fetchHoldingsList = useCallback(() => {
        axios.get(`http://localhost:8080/api/v1/${portfolioId}`)
            .then(response => {
                // Sort the data here
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
            .catch(error => {
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

    // Function to handle input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTransaction({
            ...newTransaction,
            [name]: value,
        });
    };

    // Function to handle transaction creation
    const handleCreateTransaction = async () => {
        setLoading(true);
        try {
            await axios.post(`http://localhost:8080/api/v1/${portfolioId}/createTransaction`, newTransaction)
                .then(response => {
                    setTransaction([...transaction, response.data]); // Add new transaction to the list
                    fetchHoldingsList(); // Refresh holdings data
                    handleClose(); // Close the dialog
                })
                .catch(error => {
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
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
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
                    variant="contained"
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
                        transition: 'all 0.2s ease'
                    }}
                >
                    Back to Portfolios
                </Button>
                <Typography variant="h4" component="h1">
                    {holdings.name}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                    variant="contained"
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
                        transition: 'all 0.2s ease'
                    }}
                >
                    Create New Transaction
                </Button>
            </Box>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Create New Transaction</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please enter transaction details.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        name="date"
                        label="Date"
                        type="date"
                        fullWidth
                        variant="outlined"
                        value={newTransaction.date}
                        onChange={handleInputChange}
                        focused
                    />
                    {/* Transaction Type Dropdown */}
                    <FormControl fullWidth margin="dense" variant="outlined">
                        <InputLabel id="transaction-type-label">Transaction Type</InputLabel>
                        <Select
                            labelId="transaction-type-label"
                            id="transactionType"
                            name="transactionType"
                            value={newTransaction.transactionType}
                            onChange={handleInputChange}
                            label="Transaction Type"
                            variant="outlined"
                        >
                            <MenuItem value="BUY">BUY</MenuItem>
                            <MenuItem value="SELL">SELL</MenuItem>
                            <MenuItem value="TAX">TAX</MenuItem>
                            <MenuItem value="DIVIDEND">DIVIDEND</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        margin="dense"
                        name="ticker"
                        label="Ticker"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newTransaction.ticker}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        name="quantity"
                        label="Quantity"
                        type="double"
                        fullWidth
                        variant="outlined"
                        value={newTransaction.quantity}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        name="price"
                        label="Price"
                        type="double"
                        fullWidth
                        variant="outlined"
                        value={newTransaction.price}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        name="commission"
                        label="commission"
                        type="double"
                        fullWidth
                        variant="outlined"
                        value={newTransaction.commission}
                        onChange={handleInputChange}
                    />
                    {/* Currency Dropdown */}
                    <FormControl fullWidth margin="dense" variant="outlined">
                        <InputLabel id="transaction-type-label">Currency</InputLabel>
                        <Select
                            labelId="transaction-type-label"
                            id="currency"
                            name="currency"
                            value={newTransaction.currency}
                            onChange={handleInputChange}
                            label="Currency"
                            variant="outlined"
                        >
                            <MenuItem value="USD">USD</MenuItem>
                            <MenuItem value="EUR">EUR</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleCreateTransaction} color="primary">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Navigation Links */}
            <NavigationLinks />
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
                    }
                }}
            >
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell
                                key="ticker"
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
                                key="shareAmount"
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
                                key="costPerShare"
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
                                key="currentShareValue"
                                sortDirection={orderBy === 'currentShareValue' ? order : false}
                            >
                                <TableSortLabel
                                    active={orderBy === 'currentShareValue'}
                                    direction={orderBy === 'currentShareValue' ? order : 'asc'}
                                    onClick={handleSortRequest('currentShareValue')}
                                >
                                    Current Value
                                </TableSortLabel>
                            </TableCell>
                            <TableCell
                                key="dividend"
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
                                key="dividendYield"
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
                                key="dividendYieldOnCost"
                                sortDirection={orderBy === 'dividendYieldOnCost' ? order : false}
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
                                key="totalProfit"
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
                                key="dailyChange"
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
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody sx={{
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
                        }
                    }}>
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
                                <TableCell>${holding.currentShareValue}</TableCell>
                                <TableCell>${holding.dividend}</TableCell>
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
                                <TableCell align="center">
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
