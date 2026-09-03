import { cn } from '../../lib/cn';
import type { TransactionType } from '../../types/transaction';

const typeStyles: Record<TransactionType, string> = {
  BUY:        'bg-green-50  text-green-700  ring-green-600/20  dark:bg-green-900/30  dark:text-green-400  dark:ring-green-400/25',
  SELL:       'bg-red-50    text-red-700    ring-red-600/20    dark:bg-red-900/30    dark:text-red-400    dark:ring-red-400/25',
  TAX:        'bg-slate-50  text-slate-700  ring-slate-600/20  dark:bg-slate-700/50  dark:text-slate-300  dark:ring-slate-400/25',
  DIVIDEND:   'bg-blue-50   text-blue-700   ring-blue-600/20   dark:bg-blue-900/30   dark:text-blue-400   dark:ring-blue-400/25',
  DEPOSIT:    'bg-teal-50   text-teal-700   ring-teal-600/20   dark:bg-teal-900/30   dark:text-teal-400   dark:ring-teal-400/25',
  WITHDRAWAL: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-400 dark:ring-purple-400/25',
};

interface BadgeProps {
  type: TransactionType;
}

export default function Badge({ type }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
        typeStyles[type],
      )}
    >
      {type}
    </span>
  );
}
