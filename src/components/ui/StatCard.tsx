import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
}

export default function StatCard({ label, value, icon: Icon, iconColor = 'bg-indigo-500' }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-white dark:bg-slate-900 px-4 py-5 shadow-sm border border-slate-100 dark:border-slate-800 sm:px-6 sm:py-6">
      <dt>
        <div className={`absolute rounded-md ${iconColor} p-3`}>
          <Icon className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <p className="ml-16 truncate text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </dt>
      <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      </dd>
    </div>
  );
}
