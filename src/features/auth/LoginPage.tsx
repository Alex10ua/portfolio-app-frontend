import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthShell, { AuthField, AuthHeader, AuthMobileWordmark } from './AuthShell';

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
    <AuthShell>
      <AuthMobileWordmark />

      <AuthHeader eyebrow="Welcome back" title="Sign in to your account">
        Continue tracking your portfolios.{' '}
        <Link to="/register" className="font-semibold text-primary hover:text-primary-hover dark:text-indigo-400">
          Create an account
        </Link>
      </AuthHeader>

      {successMessage && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-700 dark:bg-emerald-900/20">
          <p className="text-[13px] font-medium text-emerald-800 dark:text-emerald-300">{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-900/20">
          <p className="text-[13px] font-medium text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <AuthField
          id="username"
          label="Username"
          icon={User}
          value={username}
          onChange={setUsername}
          placeholder="your_username"
          autoComplete="username"
          autoFocus
        />
        <AuthField
          id="password"
          label="Password"
          icon={Lock}
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
        >
          Sign In
        </button>
      </form>
    </AuthShell>
  );
}
