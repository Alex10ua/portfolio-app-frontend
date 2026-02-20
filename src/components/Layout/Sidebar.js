import React, { useState, useEffect } from 'react';
import { NavLink, useMatch, useNavigate } from 'react-router-dom';
import {
    Dashboard as DashboardIcon,
    ReceiptLong as TransactionsIcon,
    MonetizationOn as DividendsIcon,
    CalendarMonth as CalendarIcon,
    PieChart as DiversificationIcon,
    Logout as LogoutIcon,
    Folder as PortfolioIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/api';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
    const match = useMatch('/:portfolioId/*');
    const portfolioId = match?.params?.portfolioId;
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [portfolios, setPortfolios] = useState([]);

    useEffect(() => {
        apiClient.get('portfolios')
            .then(response => {
                if (Array.isArray(response.data)) {
                    setPortfolios(response.data);
                } else {
                    console.error('Expected array for portfolios, got:', response.data);
                    setPortfolios([]);
                }
            })
            .catch(error => {
                console.error('Error fetching portfolios for sidebar:', error);
                setPortfolios([]);
            });
    }, []);

    const handleLogout = async (e) => {
        e.preventDefault();
        await logout();
        navigate('/login');
    };

    const navigation = [
        { name: 'All Portfolios', href: '/', icon: PortfolioIcon, exact: true },
    ];

    if (portfolioId) {
        navigation.push(
            { name: 'Dashboard', href: `/${portfolioId}`, icon: DashboardIcon, exact: true },
            { name: 'Transactions', href: `/${portfolioId}/transactions`, icon: TransactionsIcon },
            { name: 'Dividends', href: `/${portfolioId}/dividends`, icon: DividendsIcon },
            { name: 'Dividend Calendar', href: `/${portfolioId}/dividend-calendar`, icon: CalendarIcon },
            { name: 'Diversification', href: `/${portfolioId}/diversification`, icon: DiversificationIcon },
        );
    }

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
                                        className={({ isActive }) =>
                                            `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors duration-200 ${isActive
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                            }`
                                        }
                                    >
                                        <item.icon
                                            className="h-6 w-6 shrink-0"
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </li>

                    {Array.isArray(portfolios) && portfolios.length > 0 && (
                        <li>
                            <div className="text-xs font-semibold leading-6 text-slate-400 mt-4 mb-2">Your Portfolios</div>
                            <ul role="list" className="-mx-2 space-y-1">
                                {portfolios.map((portfolio) => (
                                    <li key={portfolio.portfolioId}>
                                        <NavLink
                                            to={`/${portfolio.portfolioId}`}
                                            onClick={() => setMobileOpen(false)}
                                            className={({ isActive }) =>
                                                `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors duration-200 ${isActive
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                }`
                                            }
                                        >
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-[0.625rem] font-medium text-slate-400 group-hover:text-white group-hover:border-indigo-500 transition-colors">
                                                {portfolio.portfolioName ? portfolio.portfolioName.charAt(0).toUpperCase() : 'P'}
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
                            className="w-full group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                            <LogoutIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                            Sign out
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
                <SidebarContent />
            </div>

            {/* Mobile Sidebar (Overlay) */}
            {mobileOpen && (
                <div className="relative z-50 lg:hidden" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" onClick={() => setMobileOpen(false)}></div>
                    <div className="fixed inset-0 flex">
                        <div className="relative mr-16 flex w-full max-w-xs flex-1 transform transition-transform duration-300 ease-in-out">
                            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                                <button type="button" className="-m-2.5 p-2.5" onClick={() => setMobileOpen(false)}>
                                    <span className="sr-only">Close sidebar</span>
                                    {/* Close icon could be here */}
                                </button>
                            </div>
                            <SidebarContent />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
