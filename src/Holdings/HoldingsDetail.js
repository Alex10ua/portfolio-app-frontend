import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../Holdings/HoldingDetalis.css';
import axios from 'axios';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

function HoldingsDetail() {
    const { portfolioId } = useParams();
    const navigate = useNavigate();
    const [holdings, setHoldings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
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

    if (loading) return <p>Loading holdings ...</p>;
    if (error) return <p>Error loading holdings: {error.message}</p>;
    if (!holdings) return <p>Holdings not found.</p>;


    return (
        <div>
            <button onClick={() => navigate(-1)} className="back-button">Back to Portfolios</button>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>

                            <TableCell>Holding Name</TableCell>
                            <TableCell>Ticker</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Average Price</TableCell>
                            <TableCell>Asset Type</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {holdings.map((holding) => (
                            <TableRow key={holding.holdingId}>

                                <TableCell>{holding.name}</TableCell>
                                <TableCell>{holding.tickerSymbol}</TableCell>
                                <TableCell>{holding.quantity}</TableCell>
                                <TableCell>{holding.averagePurchasePrice}</TableCell>
                                <TableCell>{holding.assetType}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>

    );
}

export default HoldingsDetail;
