import React, { useState } from 'react';
import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';

const CreateTransactionDialog = ({ open, onClose, onCreateTransaction }) => {
    const [newTransaction, setNewTransaction] = useState({
        date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format,
        transactionType: 'BUY', // Default transaction type
        ticker: '',
        quantity: '',
        price: '',
        commission: '',
        currency: 'USD', // Default currency
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTransaction({
            ...newTransaction,
            [name]: value,
        });
    };

    const handleCreate = () => {
        onCreateTransaction(newTransaction); // Pass the new transaction to the parent
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
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
                <Button onClick={onClose} color="secondary">
                    Cancel
                </Button>
                <Button onClick={handleCreate} color="primary">
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateTransactionDialog;