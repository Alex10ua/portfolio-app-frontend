import React, { useState } from 'react';
import { Menu as MenuIcon, Notifications as NotificationsIcon, Person as PersonIcon, Add as AddIcon } from '@mui/icons-material';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import apiClient from '../../api/api';

const Header = ({ setSidebarOpen }) => {
    const [open, setOpen] = useState(false);
    const [newPortfolio, setNewPortfolio] = useState({
        portfolioName: '',
        description: ''
    });

    const handleClickOpen = () => setOpen(true);
    const handleClose = () => {
        setOpen(false);
        setNewPortfolio({ portfolioName: '', description: '' });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewPortfolio({ ...newPortfolio, [name]: value });
    };

    const handleCreatePortfolio = () => {
        apiClient.post('createPortfolio', newPortfolio)
            .then(response => {
                handleClose();
                // Reload the window so that the Sidebar and Portfolio lists update
                window.location.reload();
            })
            .catch(error => {
                console.error('Error creating portfolio:', error);
            });
    };

    return (
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/80 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 backdrop-blur-md">
            <button
                type="button"
                className="-m-2.5 p-2.5 text-slate-700 lg:hidden"
                onClick={() => setSidebarOpen(true)}
            >
                <span className="sr-only">Open sidebar</span>
                <MenuIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <div className="flex flex-1 items-center">
                    <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
                </div>
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    <button
                        type="button"
                        onClick={handleClickOpen}
                        className="hidden md:inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <AddIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                        Create Portfolio
                    </button>

                    <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500">
                        <span className="sr-only">View notifications</span>
                        <NotificationsIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    <div className="h-6 w-px bg-slate-200" aria-hidden="true" />

                    <div className="flex items-center gap-x-4 lg:flex pl-4">
                        <span className="hidden lg:flex lg:items-center">
                            <span className="ml-4 text-sm font-semibold leading-6 text-slate-900" aria-hidden="true">
                                User Profile
                            </span>
                        </span>
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <PersonIcon />
                        </div>
                    </div>
                </div>
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
                        sx={{ mb: 2 }}
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
};

export default Header;
