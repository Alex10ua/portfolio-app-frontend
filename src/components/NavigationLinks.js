import React from "react";
import { Stack, Link } from "@mui/material";
import { useParams } from "react-router-dom";

const NavigationLinks = () => {
    const { portfolioId } = useParams();

    return (

        <Stack Stack
            direction="row"
            spacing={4}
            sx={{
                mt: 2,
                mb: 2,
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '8px',
                '& a': {
                    fontSize: '1rem',
                    fontWeight: 500,
                    transition: 'color 0.2s ease',
                    '&:hover': {
                        color: 'secondary.main'
                    }
                }
            }}
        >
            <Link href={`/${portfolioId}`} underline="none" sx={{ color: 'primary.main' }}>
                Dashboard
            </Link>
            <Link href={`/${portfolioId}/transactions`} underline="none" sx={{ color: 'primary.main' }}>
                Transactions
            </Link>
            <Link href={`/${portfolioId}/dividends`} underline="none" sx={{ color: 'primary.main' }}>
                Dividends
            </Link>
            <Link href={`/${portfolioId}/dividend-calendar`} underline="none" sx={{ color: 'primary.main' }}>
                Dividend Calendar
            </Link>
            <Link href={`/${portfolioId}/diversification`} underline="none" sx={{ color: 'primary.main' }}>
                Diversification
            </Link>
        </Stack >
    );
};

export default NavigationLinks;