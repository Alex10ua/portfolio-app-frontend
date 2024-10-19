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



function PortfolioList() {
    const [portfolios, setPortfolios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    if (loading) return <p>Loading portfolios...</p>;
    if (error) return <p>Error loading portfolios: {error.message}</p>;

    return (<div>
        <h1>Portfolios</h1>
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
