import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, BarChart2, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const KPI_TILES = [
  { icon: TrendingUp,  label: 'Portfolio Value',  value: '$124,840',  sub: '+18.4% this year'  },
  { icon: DollarSign,  label: 'Annual Dividends',  value: '$3,210',    sub: 'Projected income'  },
  { icon: BarChart2,   label: 'Total Return',      value: '+$22,360',  sub: 'Unrealized P&L'    },
];

const inputClass =
  'block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const { login }               = useAuth();
  const navigate                = useNavigate();
  const location                = useLocation();
  const successMessage          = (location.state as { message?: string })?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error ?? 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — indigo gradient */}
      <div
        className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center rounded-xl text-white font-bold text-xl"
            style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.2)' }}
          >
            F
          </span>
          <span className="text-lg font-bold tracking-tight">FinancePortfolio</span>
        </div>

        {/* Pitch copy */}
        <div className="space-y-4">
          <h1 className="text-[36px] font-bold leading-tight">
            Track every asset.<br />Know every return.
          </h1>
          <p className="text-indigo-200 text-[15px] leading-relaxed max-w-xs">
            Stocks, crypto, collectibles, dividends — unified in one portfolio dashboard with live P&L and multi-currency support.
          </p>

          {/* KPI tiles */}
          <div className="space-y-3 pt-4">
            {KPI_TILES.map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="flex items-center gap-4 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.2)' }}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-200">{label}</div>
                  <div className="text-[18px] font-bold tabular-nums">{value}</div>
                  <div className="text-[12px] text-indigo-300">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-indigo-300">© 2026 FinancePortfolio</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 bg-white dark:bg-slate-950">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span
              className="inline-flex items-center justify-center rounded-lg text-white font-bold text-sm"
              style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)' }}
            >
              F
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-white">FinancePortfolio</span>
          </div>

          <h2 className="text-[26px] font-bold text-slate-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-[14px] text-slate-500 dark:text-slate-400 mb-8">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Sign up
            </Link>
          </p>

          {successMessage && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-4 py-3 mb-6">
              <p className="text-[13px] font-medium text-emerald-800 dark:text-emerald-300">{successMessage}</p>
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 mb-6">
              <p className="text-[13px] font-medium text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="your_username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors shadow-sm"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
