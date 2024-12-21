//import logo from './logo.svg';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import HoldingsDetail from './Holdings/HoldingsDetail.js';
import PortfolioList from './Portfolio/PortfolioList';
import TransactionsList from './Holdings/TransactionsList';



function App() {
  return (
    <div>
      <Routes>
        <Route path="*" element={<PortfolioList />} />
        <Route path="/:portfolioId" element={<HoldingsDetail />} />
        <Route path="/:portfolioId/:transactions" element={<TransactionsList />} />
      </Routes>
    </div>
  );
}

export default App;
