//import logo from './logo.svg';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import HoldingsDetail from './Holdings/HoldingsDetail.js';
import PortfolioList from './Portfolio/PortfolioList';
import TransactionsList from './Transactions/TransactionsList';
import Dividends from './Dividends/Dividends';
import Diversification from './Diversification/Diversification.js';
import DividendsCalendar from './DividendsCalendar/DividendsCalendar.js';



function App() {
  return (
    <div>
      <Routes>
        <Route path="*" element={<PortfolioList />} />
        <Route path="/:portfolioId" element={<HoldingsDetail />} />
        <Route path="/:portfolioId/transactions" element={<TransactionsList />} />
        <Route path="/:portfolioId/dividends" element={<Dividends />} />
        <Route path="/:portfolioId/diversification" element={<Diversification />} />
        <Route path="/:portfolioId/dividend-calendar" element={<DividendsCalendar />} />
      </Routes>
    </div>
  );
}

export default App;
