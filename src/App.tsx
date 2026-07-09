import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/Layout/PrivateRoute';
import Layout from './components/Layout/Layout';
import { FullPageSpinner } from './components/ui/Spinner';

// Route pages are code-split: each becomes its own chunk loaded on navigation,
// keeping heavy deps (xlsx, recharts, the tag force-sim) out of the initial bundle.
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const PortfolioListPage = lazy(() => import('./features/portfolios/PortfolioListPage'));
const HoldingsDashboardPage = lazy(() => import('./features/holdings/HoldingsDashboardPage'));
const TransactionsPage = lazy(() => import('./features/transactions/TransactionsPage'));
const DividendsPage = lazy(() => import('./features/dividends/DividendsPage'));
const DiversificationPage = lazy(() => import('./features/diversification/DiversificationPage'));
const DividendCalendarPage = lazy(() => import('./features/dividendCalendar/DividendCalendarPage'));
const CustomAssetsPage = lazy(() => import('./features/customAssets/CustomAssetsPage'));
const PerformancePage = lazy(() => import('./features/performance/PerformancePage'));
const TagMapPage = lazy(() => import('./features/tags/TagMapPage'));
const OwnershipPage = lazy(() => import('./features/ownership/OwnershipPage'));

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<FullPageSpinner />}>
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
              <Route path="/:portfolioId/tags" element={<TagMapPage />} />
              <Route path="/:portfolioId/ownership" element={<OwnershipPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
