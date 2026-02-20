import React from 'react';
import { Menu as MenuIcon, Notifications as NotificationsIcon, Person as PersonIcon } from '@mui/icons-material';

const Header = ({ setSidebarOpen }) => {
    return (
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/80 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 backdrop-blur-md">
            <button
                type="button"
                className="-m-2.5 p-2.5 text-slate-700 lg:hidden"
                onClick={() => setSidebarOpen(true)}
            >
                <span className="sr-only">Open sidebar</span>
                <MenuIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                <div className="flex flex-1 items-center">
                    <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
                </div>
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500">
                        <span className="sr-only">View notifications</span>
                        <NotificationsIcon className="h-6 w-6" aria-hidden="true" />
                    </button>

                    <div className="h-6 w-px bg-slate-200" aria-hidden="true" />

                    <div className="flex items-center gap-x-4 lg:flex pl-4">
                        <span className="hidden lg:flex lg:items-center">
                            <span className="ml-4 text-sm font-semibold leading-6 text-slate-900" aria-hidden="true">
                                User Profile
                            </span>
                        </span>
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <PersonIcon />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
