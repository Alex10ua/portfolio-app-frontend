import { cn } from '../../lib/cn';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };

export default function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-b-2 border-indigo-600',
        sizeClass[size],
        className,
      )}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
