//import logo from './logo.svg';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import HoldingsDetail from './Holdings/HoldingsDetail.js';
import PortfolioList from './Portfolio/PortfolioList';



function App() {
  return (
    <div>
      <Routes>
        <Route path="*" element={<PortfolioList />} />
        <Route path="/:portfolioId" element={<HoldingsDetail />} />
      </Routes>
    </div>
  );
}

export default App;
