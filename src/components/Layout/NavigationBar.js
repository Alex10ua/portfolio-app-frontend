import React from 'react';
import { Link as RouterLink, useMatch } from 'react-router-dom';
import NavigationLinks from '../NavigationLinks';
import { AppBar, Toolbar, Typography, Link as MuiLink } from '@mui/material';

const NavigationBar = () => {
  const match = useMatch('/:portfolioId/*');
  const portfolioId = match?.params?.portfolioId;

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <MuiLink component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
            Finance Portfolio
          </MuiLink>
        </Typography>
        {portfolioId && <NavigationLinks portfolioId={portfolioId} />}
      </Toolbar>
    </AppBar>
  );
};

export default NavigationBar;
