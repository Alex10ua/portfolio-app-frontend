import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="mt-6 text-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-12">
      <Icon className="mx-auto h-12 w-12 text-slate-400" strokeWidth={1} />
      <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
