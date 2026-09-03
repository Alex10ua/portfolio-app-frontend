import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Split-panel frame shared by /login and /register: brand panel from `lg` up,
 * form panel on the right. The brand gradient is a Tailwind arbitrary value with
 * a `dark:` twin, so the panel follows the theme instead of staying light-indigo.
 *
 * The mockup's "Continue with Google" / "Remember me" / "Forgot password?"
 * controls are deliberately absent: SecurityConfig has form login only, and a
 * control that does nothing is worse than no control.
 */

// Illustrative product figures — the brand panel is marketing copy, not live data.
const KPIS = [
  { label: 'Tracked',    value: '€ 1.2B' },
  { label: 'Portfolios', value: '14,200' },
  { label: 'Avg XIRR',   value: '12.4%'  },
];

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex lg:w-[46%] flex-col justify-between overflow-hidden p-12 text-white bg-[radial-gradient(circle_at_20%_10%,#6366F1_0%,#4F46E5_50%,#3730A3_100%)] dark:bg-[radial-gradient(circle_at_20%_10%,#4338CA_0%,#1E1B4B_45%,#0F0E2A_100%)]">
        {/* decorative grid */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.15]">
          <defs>
            <pattern id="auth-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>

        {/* wordmark */}
        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] border border-white/25 bg-white/20 text-base font-bold text-white backdrop-blur">
            F
          </span>
          <span className="text-lg font-bold tracking-tight">FinancePortfolio</span>
        </div>

        {/* pitch */}
        <div className="relative">
          <h1 className="max-w-[460px] text-[36px] font-bold leading-[1.15] tracking-tight">
            Every euro accounted for. Every position visible.
          </h1>
          <p className="mt-[18px] max-w-[440px] text-[15px] leading-relaxed text-white/75">
            Track stocks, funds, crypto and physical assets across portfolios.
            Real dividends. Real performance. No spreadsheets.
          </p>
          <div className="mt-8 flex gap-3">
            {KPIS.map((k) => (
              <div key={k.label} className="min-w-[120px] rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
                <div className="text-[10px] font-semibold uppercase tracking-[0.10em] text-white/70">{k.label}</div>
                <div className="mt-1 text-[20px] font-bold tabular-nums">{k.value}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-white/60">© 2026 FinancePortfolio</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col justify-center bg-white px-6 py-12 dark:bg-slate-950 lg:px-16">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

/** Wordmark shown above the form on viewports with no brand panel. */
export function AuthMobileWordmark() {
  return (
    <div className="mb-8 flex items-center gap-2 lg:hidden">
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #4F46E5, #8B5CF6)' }}
      >
        F
      </span>
      <span className="text-base font-bold text-slate-900 dark:text-white">FinancePortfolio</span>
    </div>
  );
}

interface AuthHeaderProps {
  /** uppercase brand-tinted line above the title */
  eyebrow: string;
  title: string;
  children: ReactNode;
}

export function AuthHeader({ eyebrow, title, children }: AuthHeaderProps) {
  return (
    <div className="mb-7">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-primary dark:text-indigo-400">{eyebrow}</div>
      <h2 className="mb-1.5 text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
      <p className="text-[13px] text-slate-500 dark:text-slate-400">{children}</p>
    </div>
  );
}

interface AuthFieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}

export function AuthField({
  id, label, icon: Icon, value, onChange,
  type = 'text', placeholder, autoComplete, autoFocus,
}: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
      </div>
    </div>
  );
}
