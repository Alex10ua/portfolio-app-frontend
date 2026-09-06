/** Pill-shaped filter button. Shared by the tag bars and the watchlist tabs. */
export default function Chip({ label, count, active, onClick, title }: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
        active
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {label}
      {count != null && <span className="tabular-nums opacity-60">{count}</span>}
    </button>
  );
}
