//import logo from './logo.svg';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Routes, Route, Link } from 'react-router-dom';
import HoldingsDetail from '../Holdings/HoldingsDetail';
import {
    Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    TextField, Typography, Box
} from '@mui/material';



function PortfolioList() {
    const [portfolios, setPortfolios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(false);
    const [newPortfolio, setNewPortfolio] = useState({
        portfolioName: '',
        description: ''
    });

    useEffect(() => {
        axios.get('http://localhost:8080/api/v1/portfolios')
            .then(response => {
                setPortfolios(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching portfolios:', error);
                setError(error);
                setLoading(false);
            });
    }, []);

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
        setNewPortfolio({
            ...newPortfolio,
            [name]: value,
        });
    };

    // Function to handle portfolio creation
    const handleCreatePortfolio = () => {
        axios.post('http://localhost:8080/api/v1/createPortfolio', newPortfolio)
            .then(response => {
                setPortfolios([...portfolios, response.data]); // Add new portfolio to the list
                handleClose(); // Close the dialog
            })
            .catch(error => {
                console.error('Error creating portfolio:', error);
            });
    };

    if (loading) return <p>Loading portfolios...</p>;
    if (error) return <p>Error loading portfolios: {error.message}</p>;

    return (<div>
        <h1>Portfolios</h1>

        <Box sx={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1">
                    Portfolio List
                </Typography>
                <Button variant="contained" color="primary" onClick={handleClickOpen}>
                    Create New Portfolio
                </Button>
            </Box>
            {/* Dialog for Creating a New Portfolio */}
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Create New Portfolio</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please enter the portfolio name and description to create a new portfolio.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        name="portfolioName"
                        label="Portfolio Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newPortfolio.portfolioName}
                        onChange={handleInputChange}
                    />
                    <TextField
                        margin="dense"
                        name="description"
                        label="Description"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newPortfolio.description}
                        onChange={handleInputChange}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleCreatePortfolio} color="primary">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>

        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Portfolio ID</TableCell>
                        <TableCell>Portfolio Name</TableCell>
                        <TableCell>Description</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {portfolios.map((portfolio) => (
                        <TableRow key={portfolio.portfolioId}>
                            <TableCell>{portfolio.portfolioId}</TableCell>
                            <TableCell><Link to={`/${portfolio.portfolioId}`}>
                                {portfolio.portfolioName}
                            </Link></TableCell>
                            <TableCell>{portfolio.description}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
        <Routes>
            <Route path=":portfolioId" element={<HoldingsDetail />} />
        </Routes>
    </div>
    );
}

export default PortfolioList;
