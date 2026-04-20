import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/Layout/PrivateRoute';
import Layout from './components/Layout/Layout';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import PortfolioListPage from './features/portfolios/PortfolioListPage';
import HoldingsDashboardPage from './features/holdings/HoldingsDashboardPage';
import TransactionsPage from './features/transactions/TransactionsPage';
import DividendsPage from './features/dividends/DividendsPage';
import DiversificationPage from './features/diversification/DiversificationPage';
import DividendCalendarPage from './features/dividendCalendar/DividendCalendarPage';
import CustomAssetsPage from './features/customAssets/CustomAssetsPage';
import PerformancePage from './features/performance/PerformancePage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<PortfolioListPage />} />
            <Route path="/:portfolioId" element={<HoldingsDashboardPage />} />
            <Route path="/:portfolioId/transactions" element={<TransactionsPage />} />
            <Route path="/:portfolioId/dividends" element={<DividendsPage />} />
            <Route path="/:portfolioId/diversification" element={<DiversificationPage />} />
            <Route path="/:portfolioId/dividend-calendar" element={<DividendCalendarPage />} />
            <Route path="/:portfolioId/custom-assets" element={<CustomAssetsPage />} />
            <Route path="/:portfolioId/performance" element={<PerformancePage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
