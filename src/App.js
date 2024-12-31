//import logo from './logo.svg';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import HoldingsDetail from './Holdings/HoldingsDetail.js';
import PortfolioList from './Portfolio/PortfolioList';
import TransactionsList from './Holdings/TransactionsList';
import Dividends from './Dividends/Dividends';



function App() {
  return (
    <div>
      <Routes>
        <Route path="*" element={<PortfolioList />} />
        <Route path="/:portfolioId" element={<HoldingsDetail />} />
        <Route path="/:portfolioId/transactions" element={<TransactionsList />} />
        <Route path="/:portfolioId/dividends" element={<Dividends />} />
      </Routes>
    </div>
  );
}

export default App;
