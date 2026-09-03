import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthShell, { AuthField, AuthHeader, AuthMobileWordmark } from './AuthShell';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strength = checks.filter(Boolean).length;
  const colors = ['bg-slate-200 dark:bg-slate-700', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-colors ${i <= strength ? colors[strength] : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${
        strength <= 1 ? 'text-red-500 dark:text-red-400'
          : strength === 2 ? 'text-amber-500 dark:text-amber-400'
            : strength === 3 ? 'text-blue-500 dark:text-blue-400'
              : 'text-emerald-500 dark:text-emerald-400'}`}
      >
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
    <AuthShell>
      <AuthMobileWordmark />

      <AuthHeader eyebrow="Get started" title="Create your account">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:text-primary-hover dark:text-indigo-400">
          Sign in
        </Link>
      </AuthHeader>

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
          id="email"
          label="Email address"
          icon={Mail}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <div>
          <AuthField
            id="password"
            label="Password"
            icon={Lock}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <PasswordStrength password={password} />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-950"
        >
          {isLoading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </AuthShell>
  );
}
