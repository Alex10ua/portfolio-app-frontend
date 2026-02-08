import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/api';

function ImportTransactions() {
    const { portfolioId } = useParams();
    const navigate = useNavigate();

    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imports, setImports] = useState([]);
    const [error, setError] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailData, setDetailData] = useState(null);

    const fetchImports = useCallback(() => {
        apiClient
            .get(`${portfolioId}/imports`)
            .then((res) => setImports(res.data || []))
            .catch((err) => {
                console.error('Error fetching imports', err);
                setError(err);
            });
    }, [portfolioId]);

    useEffect(() => {
        fetchImports();
    }, [fetchImports]);

    const handleDeleteImport = async (importId) => {
        try {
            await apiClient.delete(`${portfolioId}/imports/${importId}`);
            fetchImports();
        } catch (err) {
            console.error('Delete failed', err);
            setError(err);
        }
    };

    const handleViewImport = async (importId) => {
        try {
            const res = await apiClient.get(`${portfolioId}/imports/${importId}`);
            setDetailData(res.data);
            setDetailOpen(true);
        } catch (err) {
            console.error('Fetch import detail failed', err);
            setError(err);
        }
    };

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        setUploading(true);
        try {
            await apiClient.post(`${portfolioId}/imports`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            fetchImports();
        } catch (err) {
            console.error('Upload failed', err);
            setError(err);
        } finally {
            setUploading(false);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            uploadFile(files[0]);
        }
    };

    const onInputChange = (e) => {
        const files = e.target.files;
        if (files && files[0]) uploadFile(files[0]);
    };

    return (
        <Box sx={{ padding: 3, maxWidth: 900, margin: '0 auto' }}>
            <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(`/${portfolioId}`)}
                sx={{ mb: 2 }}
            >
                Back to Holdings
            </Button>

            <Typography variant="h5" gutterBottom>
                Import Transactions
            </Typography>

            <Paper
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                sx={{
                    p: 4,
                    mb: 3,
                    textAlign: 'center',
                    border: dragOver ? '2px dashed primary.main' : '2px dashed rgba(0,0,0,0.12)',
                    backgroundColor: dragOver ? 'rgba(0, 120, 212, 0.04)' : 'transparent',
                }}
            >
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Drag and drop a transactions file here, or
                </Typography>
                <input
                    id="file-input"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={onInputChange}
                    style={{ display: 'none' }}
                />
                <label htmlFor="file-input">
                    <Button variant="contained" component="span">
                        Choose File
                    </Button>
                </label>
                {uploading && <Box sx={{ mt: 2 }}><CircularProgress size={24} /></Box>}
            </Paper>

            <Typography variant="h6" gutterBottom>
                Import History
            </Typography>

            {error && <Typography color="error">Error: {error.message}</Typography>}

            <List component={Paper} sx={{ maxHeight: 360, overflow: 'auto' }}>
                {imports.length === 0 && (
                    <ListItem>
                        <ListItemText primary="No import history" />
                    </ListItem>
                )}
                {imports.map((imp) => (
                    <ListItem
                        key={imp.id || imp.filename}
                        secondaryAction={(
                            <Box>
                                <IconButton edge="end" onClick={() => handleViewImport(imp.id)} aria-label="view">
                                    <VisibilityIcon />
                                </IconButton>
                                <IconButton edge="end" onClick={() => handleDeleteImport(imp.id)} aria-label="delete">
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        )}
                    >
                        <ListItemText
                            primary={imp.filename || imp.name}
                            secondary={imp.uploadedAt ? new Date(imp.uploadedAt).toLocaleString() : ''}
                        />
                    </ListItem>
                ))}
            </List>

            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Imported Transactions</DialogTitle>
                <DialogContent dividers>
                    {!detailData && <CircularProgress />}
                    {detailData && (
                        <Box>
                            <Typography variant="subtitle1">File: {detailData.filename || detailData.name}</Typography>
                            <Box sx={{ mt: 2 }}>
                                {Array.isArray(detailData.transactions) && detailData.transactions.length > 0 ? (
                                    detailData.transactions.map((t, i) => (
                                        <Paper key={i} sx={{ p: 1, mb: 1 }}>
                                            <Typography variant="body2">{JSON.stringify(t)}</Typography>
                                        </Paper>
                                    ))
                                ) : (
                                    <Typography>No transactions available for this import.</Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ImportTransactions;
