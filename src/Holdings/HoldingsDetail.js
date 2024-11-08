import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../Holdings/HoldingDetalis.css';
import axios from 'axios';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Typography, Button, Box, IconButton, TextField
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';

function HoldingsDetail() {
    const { portfolioId } = useParams();
    const navigate = useNavigate();
    const [holdings, setHoldings] = useState(null);
    const [transaction, setTransaction] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [open, setOpen] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        date: '',
        assetName: '',
        tickerSymbol: '',
        quantity: '',
        price: '',
        totalAmount: '',
        commission: '',
    });
    // Function to fetch holdings data
    // Use useCallback to memoize fetchHoldings
    const fetchHoldingsList = useCallback(() => {
        axios.get(`http://localhost:8080/api/v1/${portfolioId}`)
            .then(response => {
                setHoldings(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching holdings details:', error);
                setError(error);
                setLoading(false);
            });
    }, [portfolioId]);

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
    const handleCreateTransaction = () => {
        axios.post(`http://localhost:8080/api/v1/${portfolioId}/createTransaction`, newTransaction)
            .then(response => {
                setTransaction([...transaction, response.data]); // Add new transaction to the list
                fetchHoldingsList(); // Refresh holdings data
                handleClose(); // Close the dialog
            })
            .catch(error => {
                console.error('Error creating transaction:', error);
            });
    };

    if (loading) return <p>Loading holdings ...</p>;
    if (error) return <p>Error loading holdings: {error.message}</p>;
    if (!holdings) return <p>Holdings not found.</p>;

    const filteredHoldings = holdings.filter(holding =>
        (holding.tickerSymbol || '').toLowerCase().includes(searchTerm || ''.toLowerCase())
    );


    return (
        <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1">
                    {holdings.name}
                </Typography>
                <Button variant="contained" color="primary" onClick={() => navigate('/')}>
                    Back to Portfolios
                </Button>
                <Button variant="contained" color="primary" onClick={handleClickOpen}>
                    Create New Transaction
                </Button>

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
                        />
                        <TextField
                            autoFocus
                            margin="dense"
                            name="assetName"
                            label="AssetName"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={newTransaction.assetName}
                            onChange={handleInputChange}
                        />
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
                            name="totalAmount"
                            label="Total"
                            type="double"
                            fullWidth
                            variant="outlined"
                            value={newTransaction.totalAmount}
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
            </Box>

            {/* Search Bar */}
            <TextField
                variant="outlined"
                label="Search Holdings"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ marginTop: '20px', marginBottom: '20px', width: '300px' }}
            />

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Holding</TableCell>
                            <TableCell>Shares</TableCell>
                            <TableCell>Cost per Share</TableCell>
                            <TableCell>Current Value</TableCell>
                            <TableCell>Dividends</TableCell>
                            <TableCell>Dividend Yield</TableCell>
                            <TableCell>Dividend Yield On Cost</TableCell>
                            <TableCell>Total Profit</TableCell>
                            <TableCell>Daily Change</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredHoldings.map((holding, index) => (
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
