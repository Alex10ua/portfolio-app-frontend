import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
  trend?: string;
  trendUp?: boolean;
  sub?: string;
}

export default function StatCard({
  label, value, icon: Icon,
  accent = '#4F46E5',
  trend, trendUp, sub,
}: StatCardProps) {
  const dir = trendUp ?? (trend ? !trend.startsWith('-') : undefined);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 36, height: 36, background: `${accent}1A` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: accent, width: 18, height: 18 }} />
        </div>
        {trend != null && (
          <div
            className="flex items-center gap-1 text-[12px] font-semibold"
            style={{ color: dir ? '#10B981' : '#EF4444' }}
          >
            {dir ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </div>
        )}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
        {label}
      </div>
      <div className="text-[22px] font-semibold text-slate-900 dark:text-white tabular-nums leading-tight">
        {value}
      </div>
      {sub && (
        <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">{sub}</div>
      )}
    </div>
  );
}
