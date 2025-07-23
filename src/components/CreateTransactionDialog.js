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
    date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
    transactionType: 'BUY', // Default transaction type
    assetType: 'STOCK', // New field to select STOCK, FIGURiNE, COIN, FUND
    ticker: '',
    quantity: '',
    price: '',
    commission: '',
    currency: 'USD', // Default currency
    name: '',
    priceNow: ''
  });

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState({
    ticker: false,
    quantity: false,
    price: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTransaction({
      ...newTransaction,
      [name]: value,
    });
  };

  const handleBlur = (e) => {
    setTouched({
      ...touched,
      [e.target.name]: true,
    });
  };

  const handleCreate = () => {
    setSubmitAttempted(true);
    if (!newTransaction.ticker || !newTransaction.price || !newTransaction.quantity) {
      return; // Don't submit if required fields are empty
    }
    onCreateTransaction(newTransaction); // Pass the new transaction to the parent
    onClose();
    setSubmitAttempted(false); // Reset after successful submit
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create New Transaction</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter transaction details.
        </DialogContentText>
        {/* Transaction Category Dropdown */}
        <FormControl fullWidth margin='dense' variant='outlined'>
          <InputLabel id='asset-type-category-label'>
            Asset Type
          </InputLabel>
          <Select
            labelId='transaction-category-label'
            id='assetType'
            name='assetType'
            value={newTransaction.assetType}
            onChange={handleInputChange}
            label='Asset Type'
            variant='outlined'
          >
            <MenuItem value='STOCK'>STOCK</MenuItem>
            <MenuItem value='FIGURINE'>FIGURINE</MenuItem>
            <MenuItem value='COIN'>COIN</MenuItem>
            <MenuItem value='FUND'>FUND</MenuItem>
          </Select>
        </FormControl>
        {/* Common Date Field */}
        <TextField
          autoFocus
          margin='dense'
          name='date'
          label='Date'
          type='date'
          fullWidth
          variant='outlined'
          value={newTransaction.date}
          onChange={handleInputChange}
          focused
        />
        <TextField
          margin='dense'
          name='ticker'
          label='Ticker'
          type='text'
          fullWidth
          variant='outlined'
          value={newTransaction.ticker}
          onChange={handleInputChange}
          onBlur={handleBlur}
          required
          error={(submitAttempted || touched.ticker) && !newTransaction.ticker}
          helperText={(submitAttempted || touched.ticker) && !newTransaction.ticker ? 'Ticker is required' : ''}
        />
        <TextField
          margin='dense'
          name='quantity'
          label='Quantity'
          type='double'
          fullWidth
          variant='outlined'
          value={newTransaction.quantity}
          onChange={handleInputChange}
          onBlur={handleBlur}
          required
          error={(submitAttempted || touched.quantity) && !newTransaction.quantity}
          helperText={(submitAttempted || touched.quantity) && !newTransaction.quantity ? 'Quantity is required' : ''}
        />
        <TextField
          margin='dense'
          name='price'
          label='Price'
          type='double'
          fullWidth
          variant='outlined'
          value={newTransaction.price}
          onChange={handleInputChange}
          onBlur={handleBlur}
          required
          error={(submitAttempted || touched.price) && !newTransaction.price}
          helperText={(submitAttempted || touched.price) && !newTransaction.price ? 'Price is required' : ''}
        />
        <TextField
          margin='dense'
          name='commission'
          label='commission'
          type='double'
          fullWidth
          variant='outlined'
          value={newTransaction.commission}
          onChange={handleInputChange}
        />
        {/* Currency Dropdown */}
        <FormControl fullWidth margin='dense' variant='outlined'>
          <InputLabel id='currency-label'>Currency</InputLabel>
          <Select
            labelId='currency-label'
            id='currency'
            name='currency'
            value={newTransaction.currency}
            onChange={handleInputChange}
            label='Currency'
            variant='outlined'
          >
            <MenuItem value='USD'>USD</MenuItem>
            <MenuItem value='EUR'>EUR</MenuItem>
          </Select>
        </FormControl>
        {/* Conditional fields based on assetType */}
        {(() => {
          switch (newTransaction.assetType) {
            case 'STOCK':
              return (
                <>
                  <FormControl fullWidth margin='dense' variant='outlined'>
                    <InputLabel id='transaction-type-label'>Transaction Type</InputLabel>
                    <Select
                      labelId='transaction-type-label'
                      id='transactionType'
                      name='transactionType'
                      value={newTransaction.transactionType}
                      onChange={handleInputChange}
                      label='Transaction Type'
                    >
                      <MenuItem value='BUY'>BUY</MenuItem>
                      <MenuItem value='SELL'>SELL</MenuItem>
                      <MenuItem value='TAX'>TAX</MenuItem>
                      <MenuItem value='DIVIDEND'>DIVIDEND</MenuItem>
                    </Select>
                  </FormControl>
                </>
              );
            case 'FIGURINE':
              return (
                <>
                  <FormControl
                    fullWidth
                    margin='dense'
                    variant='outlined'
                  >
                    <InputLabel id='transaction-type-label'>
                      Transaction Type
                    </InputLabel>
                    <Select
                      labelId='transaction-type-label'
                      id='transactionType'
                      name='transactionType'
                      value={newTransaction.transactionType}
                      onChange={handleInputChange}
                      label='Transaction Type'
                    >
                      <MenuItem value='BUY'>BUY</MenuItem>
                      <MenuItem value='SELL'>SELL</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    margin='dense'
                    name='name'
                    label='Figurine Name'
                    type='text'
                    fullWidth
                    variant='outlined'
                    value={newTransaction.name}
                    onChange={handleInputChange}
                  />
                  <TextField
                    margin='dense'
                    name='priceNow'
                    label='Price Now'
                    type='double'
                    fullWidth
                    variant='outlined'
                    value={newTransaction.priceNow}
                    onChange={handleInputChange}
                  />
                </>
              );
            case 'COIN':
              return (
                <>
                  <FormControl
                    fullWidth
                    margin='dense'
                    variant='outlined'
                  >
                    <InputLabel id='transaction-type-label'>
                      Transaction Type
                    </InputLabel>
                    <Select
                      labelId='transaction-type-label'
                      id='transactionType'
                      name='transactionType'
                      value={newTransaction.transactionType}
                      onChange={handleInputChange}
                      label='Transaction Type'
                    >
                      <MenuItem value='BUY'>BUY</MenuItem>
                      <MenuItem value='SELL'>SELL</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    margin='dense'
                    name='name'
                    label='Coin Name'
                    type='text'
                    fullWidth
                    variant='outlined'
                    value={newTransaction.name}
                    onChange={handleInputChange}
                  />
                  <TextField
                    margin='dense'
                    name='priceNow'
                    label='Price Now'
                    type='double'
                    fullWidth
                    variant='outlined'
                    value={newTransaction.priceNow}
                    onChange={handleInputChange}
                  />
                </>
              );
            case 'FUND':
              return (
                <>
                  <FormControl
                    fullWidth
                    margin='dense'
                    variant='outlined'
                  >
                    <InputLabel id='transaction-type-label'>
                      Transaction Type
                    </InputLabel>
                    <Select
                      labelId='transaction-type-label'
                      id='transactionType'
                      name='transactionType'
                      value={newTransaction.transactionType}
                      onChange={handleInputChange}
                      label='Transaction Type'
                    >
                      <MenuItem value='BUY'>BUY</MenuItem>
                      <MenuItem value='SELL'>SELL</MenuItem>
                      <MenuItem value='DIVIDEND'>DIVIDEND</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    margin='dense'
                    name='fundName'
                    label='Fund Name'
                    type='text'
                    fullWidth
                    variant='outlined'
                    value={newTransaction.name}
                    onChange={handleInputChange}
                  />
                  <TextField
                    margin='dense'
                    name='priceNow'
                    label='Price Now'
                    type='double'
                    fullWidth
                    variant='outlined'
                    value={newTransaction.priceNow}
                    onChange={handleInputChange}
                  />
                </>
              );
            default:
              return null;
          }
        })()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='secondary'>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          color='primary'
          disabled={
            !newTransaction.ticker ||
            !newTransaction.price ||
            !newTransaction.quantity
          }
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTransactionDialog;