import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
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
const StockValuationPage = lazy(() => import('./features/valuation/StockValuationPage'));
const StatisticsPage = lazy(() => import('./features/statistics/StatisticsPage'));
const HistoricalPage = lazy(() => import('./features/historical/HistoricalPage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));

// Portfolio pages keep per-portfolio UI state (column config, chart start, sort,
// filter) seeded from that portfolio's settings on mount. Keying the outlet by
// portfolioId remounts them on a portfolio switch — without it React reuses the
// instance and the previous portfolio's settings get written onto the new one.
function PortfolioScope() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  return <Outlet key={portfolioId} />;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<PortfolioListPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/:portfolioId" element={<PortfolioScope />}>
                <Route index element={<HoldingsDashboardPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="dividends" element={<DividendsPage />} />
                <Route path="diversification" element={<DiversificationPage />} />
                <Route path="dividend-calendar" element={<DividendCalendarPage />} />
                <Route path="custom-assets" element={<CustomAssetsPage />} />
                <Route path="performance" element={<PerformancePage />} />
                <Route path="tags" element={<TagMapPage />} />
                <Route path="ownership" element={<OwnershipPage />} />
                <Route path="valuation" element={<StockValuationPage />} />
                <Route path="statistics" element={<StatisticsPage />} />
                <Route path="historical" element={<HistoricalPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
      </SettingsProvider>
    </AuthProvider>
  );
}
