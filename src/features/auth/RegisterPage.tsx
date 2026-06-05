import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Globe, PieChart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const FEATURES = [
  { icon: PieChart,    title: 'Multi-asset portfolios',   desc: 'Stocks, crypto, coins, collectibles — all in one place.' },
  { icon: Globe,       title: 'Multi-currency support',   desc: 'Auto FX conversion across USD, EUR, GBP, PLN and more.'  },
  { icon: ShieldCheck, title: 'Private & self-hosted',    desc: 'Your data stays on your infrastructure, always.'          },
];

const inputClass =
  'block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strength = checks.filter(Boolean).length;
  const colors = ['bg-slate-200', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? colors[strength] : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${strength <= 1 ? 'text-red-500' : strength === 2 ? 'text-amber-500' : strength === 3 ? 'text-blue-500' : 'text-emerald-500'}`}>
        {labels[strength]}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const [username,  setUsername]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register }              = useAuth();
  const navigate                  = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await register({ username, email, passwordHash: password });
    if (result.success) {
      navigate('/login', { state: { message: 'Registration successful. Please log in.' } });
    } else {
      setError(result.error ?? 'Registration failed');
      setIsLoading(false);
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

        <div className="space-y-6">
          <div>
            <h1 className="text-[36px] font-bold leading-tight mb-3">
              Start tracking.<br />Start growing.
            </h1>
            <p className="text-indigo-200 text-[15px] leading-relaxed max-w-xs">
              Join and get full visibility into every position, dividend, and return across all your portfolios.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}>
                  <Icon className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold">{title}</div>
                  <div className="text-[13px] text-indigo-300 mt-0.5">{desc}</div>
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

          <h2 className="text-[26px] font-bold text-slate-900 dark:text-white mb-1">Create your account</h2>
          <p className="text-[14px] text-slate-500 dark:text-slate-400 mb-8">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>

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
              <label htmlFor="email" className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
              <PasswordStrength password={password} />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
