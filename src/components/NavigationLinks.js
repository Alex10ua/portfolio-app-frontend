import React from 'react';
import { Stack, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const NavigationLinks = ({ portfolioId }) => {
  const commonLinkStyles = {
    color: 'inherit',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: 500,
    transition: 'color 0.2s ease',
    '&:hover': {
      color: 'secondary.main',
    },
  };

  return (
    <Stack
      direction="row"
      spacing={4}
      sx={{
        justifyContent: 'center',
        padding: '1rem',
        borderRadius: '8px',
      }}
    >
      <MuiLink component={RouterLink} to={`/${portfolioId}`} sx={commonLinkStyles}>
        Dashboard
      </MuiLink>
      <MuiLink component={RouterLink} to={`/${portfolioId}/transactions`} sx={commonLinkStyles}>
        Transactions
      </MuiLink>
      <MuiLink component={RouterLink} to={`/${portfolioId}/dividends`} sx={commonLinkStyles}>
        Dividends
      </MuiLink>
      <MuiLink component={RouterLink} to={`/${portfolioId}/dividend-calendar`} sx={commonLinkStyles}>
        Dividend Calendar
      </MuiLink>
      <MuiLink component={RouterLink} to={`/${portfolioId}/diversification`} sx={commonLinkStyles}>
        Diversification
      </MuiLink>
    </Stack>
  );
};

export default NavigationLinks;
