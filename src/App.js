import './App.css';
import { Routes, Route } from 'react-router-dom';
import HoldingsDetail from './Holdings/HoldingsDetail.js';
import PortfolioList from './Portfolio/PortfolioList';
import TransactionsList from './Transactions/TransactionsList';
import Dividends from './Dividends/Dividends';
import Diversification from './Diversification/Diversification.js';
import DividendsCalendar from './DividendsCalendar/DividendsCalendar.js';
import Layout from './components/Layout/Layout.js';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Register from './components/Register';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<PortfolioList />} />
            <Route path="/:portfolioId" element={<HoldingsDetail />} />
            <Route path="/:portfolioId/transactions" element={<TransactionsList />} />
            <Route path="/:portfolioId/dividends" element={<Dividends />} />
            <Route path="/:portfolioId/diversification" element={<Diversification />} />
            <Route path="/:portfolioId/dividend-calendar" element={<DividendsCalendar />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
