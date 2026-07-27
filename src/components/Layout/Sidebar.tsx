import { NavLink, useMatch, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ReceiptText, DollarSign, CalendarDays,
  PieChart, LogOut, FolderOpen, Boxes, TrendingUp, X, Network, Crown, Calculator,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortfolios } from '../../hooks/usePortfolios';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const PALETTE = [
  '#4F46E5', '#14B8A6', '#F59E0B', '#8B5CF6',
  '#EF4444', '#10B981', '#3B82F6', '#EC4899',
];

function Avatar({ letter, color, size = 22 }: { letter: string; color: string; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {letter}
    </span>
  );
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

  const subNav = [
    { name: 'Dashboard',          href: `/${portfolioId}`,                       icon: LayoutDashboard, exact: true },
    { name: 'Transactions',       href: `/${portfolioId}/transactions`,           icon: ReceiptText,     exact: false },
    { name: 'Custom Assets',      href: `/${portfolioId}/custom-assets`,          icon: Boxes,           exact: false },
    { name: 'Dividends',          href: `/${portfolioId}/dividends`,              icon: DollarSign,      exact: false },
    { name: 'Dividend Calendar',  href: `/${portfolioId}/dividend-calendar`,      icon: CalendarDays,    exact: false },
    { name: 'Ownership',          href: `/${portfolioId}/ownership`,              icon: Crown,           exact: false },
    { name: 'Stock Valuation',    href: `/${portfolioId}/valuation`,              icon: Calculator,      exact: false },
    { name: 'Diversification',    href: `/${portfolioId}/diversification`,        icon: PieChart,        exact: false },
    { name: 'Performance',        href: `/${portfolioId}/performance`,            icon: TrendingUp,      exact: false },
    { name: 'Tag Mind Map',       href: `/${portfolioId}/tags`,                   icon: Network,         exact: false },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Wordmark */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div
          className="flex items-center justify-center rounded-lg text-white font-bold text-sm flex-shrink-0"
          style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)' }}
        >
          F
        </div>
        <span className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">
          FinancePortfolio
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {/* All Portfolios */}
        <NavLink
          to="/"
          end
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors mb-0.5 ${
              isActive
                ? 'bg-primary-50 dark:bg-indigo-500/20 text-primary dark:text-indigo-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            }`
          }
        >
          <FolderOpen className="h-4 w-4 flex-shrink-0" />
          All Portfolios
        </NavLink>

        {/* Portfolio list */}
        {portfolios.length > 0 && (
          <>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 pt-4 pb-2">
              Your Portfolios
            </div>

            {portfolios.map((portfolio, idx) => {
              const color = PALETTE[idx % PALETTE.length];
              const letter = portfolio.portfolioName.charAt(0).toUpperCase();
              const isActive = portfolioId === String(portfolio.portfolioId);

              return (
                <div key={portfolio.portfolioId}>
                  <NavLink
                    to={`/${portfolio.portfolioId}`}
                    end
                    onClick={() => setMobileOpen(false)}
                    className={() =>
                      `flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors mb-0.5 ${
                        isActive
                          ? 'bg-primary-50 dark:bg-indigo-500/20 text-primary dark:text-indigo-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                      }`
                    }
                  >
                    <Avatar letter={letter} color={color} size={22} />
                    <span title={portfolio.portfolioName} className="flex-1 truncate">{portfolio.portfolioName}</span>
                  </NavLink>

                  {/* Contextual sub-nav under active portfolio */}
                  {isActive && (
                    <div className="mb-1">
                      {subNav.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          end={item.exact}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive: subActive }) =>
                            `flex items-center gap-2 rounded-md pl-9 pr-3 py-[6px] text-[12px] transition-colors mb-px ${
                              subActive
                                ? 'bg-primary-50 dark:bg-indigo-500/20 text-primary dark:text-indigo-400 font-semibold'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
                            }`
                          }
                        >
                          <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                          {item.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-60 lg:flex-col">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="relative z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-0 flex">
            <div className="relative flex w-full max-w-xs flex-1">
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
