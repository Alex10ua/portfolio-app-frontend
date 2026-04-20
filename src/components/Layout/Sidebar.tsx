import { NavLink, useMatch, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  DollarSign,
  CalendarDays,
  PieChart,
  LogOut,
  FolderOpen,
  X,
  Boxes,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortfolios } from '../../hooks/usePortfolios';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const match = useMatch('/:portfolioId/*');
  const portfolioId = match?.params.portfolioId;
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data: portfolios = [] } = usePortfolios();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'All Portfolios', href: '/', icon: FolderOpen, exact: true },
  ];

  if (portfolioId) {
    navigation.push(
      { name: 'Dashboard', href: `/${portfolioId}`, icon: LayoutDashboard, exact: true },
      { name: 'Transactions', href: `/${portfolioId}/transactions`, icon: ReceiptText, exact: false },
      { name: 'Custom Assets', href: `/${portfolioId}/custom-assets`, icon: Boxes, exact: false },
      { name: 'Dividends', href: `/${portfolioId}/dividends`, icon: DollarSign, exact: false },
      { name: 'Dividend Calendar', href: `/${portfolioId}/dividend-calendar`, icon: CalendarDays, exact: false },
      { name: 'Diversification', href: `/${portfolioId}/diversification`, icon: PieChart, exact: false },
    );
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors duration-200 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`;

  const SidebarContent = () => (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 px-6 pb-4 ring-1 ring-white/10 h-full border-r border-slate-800">
      <div className="flex h-16 shrink-0 items-center">
        <span className="text-xl font-bold text-white tracking-tight">FinancePortfolio</span>
      </div>

      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    end={item.exact}
                    onClick={() => setMobileOpen(false)}
                    className={navLinkClass}
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>

          {portfolios.length > 0 && (
            <li>
              <div className="text-xs font-semibold leading-6 text-slate-400 mt-4 mb-2">Your Portfolios</div>
              <ul role="list" className="-mx-2 space-y-1">
                {portfolios.map((portfolio) => (
                  <li key={portfolio.portfolioId}>
                    <NavLink
                      to={`/${portfolio.portfolioId}`}
                      onClick={() => setMobileOpen(false)}
                      className={navLinkClass}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-[0.625rem] font-medium text-slate-400 group-hover:text-white group-hover:border-indigo-500 transition-colors">
                        {portfolio.portfolioName.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{portfolio.portfolioName}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          )}

          <li className="mt-auto">
            <button
              onClick={handleLogout}
              className="w-full group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="relative z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5 text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
