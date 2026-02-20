import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import apiClient from '../api/api';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button
} from '@mui/material';
import { Add as AddIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

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
        apiClient.get('portfolios')
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

    const handleClickOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewPortfolio({ ...newPortfolio, [name]: value });
    };

    const handleCreatePortfolio = () => {
        apiClient.post('createPortfolio', newPortfolio)
            .then(response => {
                setPortfolios([...portfolios, response.data]);
                handleClose();
            })
            .catch(error => {
                console.error('Error creating portfolio:', error);
            });
    };

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <div className="text-lg font-medium text-slate-500">Loading portfolios...</div>
        </div>
    );

    if (error) return (
        <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading portfolios</h3>
                    <div className="mt-2 text-sm text-red-700">
                        <p>{error.message}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight">
                        My Portfolios
                    </h2>
                </div>
                <div className="mt-4 flex md:ml-4 md:mt-0">
                    <button
                        type="button"
                        onClick={handleClickOpen}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <AddIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                        Create New Portfolio
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {portfolios.map((portfolio) => (
                    <div
                        key={portfolio.portfolioId}
                        className="col-span-1 divide-y divide-slate-200 rounded-lg bg-white shadow hover:shadow-md transition-shadow duration-200 border border-slate-100"
                    >
                        <div className="flex w-full items-center justify-between space-x-6 p-6">
                            <div className="flex-1 truncate">
                                <div className="flex items-center space-x-3">
                                    <h3 className="truncate text-lg font-medium text-slate-900">
                                        {portfolio.portfolioName}
                                    </h3>
                                </div>
                                <p className="mt-1 truncate text-sm text-slate-500">{portfolio.description || "No description provided"}</p>
                            </div>
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                {portfolio.portfolioName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div>
                            <div className="-mt-px flex divide-x divide-slate-200">
                                <div className="flex w-0 flex-1">
                                    <RouterLink
                                        to={`/${portfolio.portfolioId}`}
                                        className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-slate-900 hover:text-indigo-600 hover:bg-slate-50"
                                    >
                                        View Dashboard
                                        <ArrowForwardIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                    </RouterLink>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Dialog for Creating a New Portfolio */}
            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle className="font-bold text-slate-900">Create New Portfolio</DialogTitle>
                <DialogContent>
                    <p className="mb-4 text-sm text-slate-500">
                        Enter the details below to create a new portfolio.
                    </p>
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
                        className="mb-4"
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
                    <Button onClick={handleClose} sx={{ color: 'text.secondary' }}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreatePortfolio} variant="contained" color="primary">
                        Create Portfolio
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default PortfolioList;
