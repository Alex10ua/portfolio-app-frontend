import { useState } from 'react';
import { useLocation, useMatch } from 'react-router-dom';
import { Menu, Plus, Bell, Sun, Moon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTheme } from '../../hooks/useTheme';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePortfolio } from '../../hooks/usePortfolios';
import { usePortfolios } from '../../hooks/usePortfolios';
import Dialog from '../ui/Dialog';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const schema = z.object({
  portfolioName: z.string().min(1, 'Name is required'),
  description: z.string(),
});
type FormValues = z.infer<typeof schema>;

function usePageTitle(): { title: string; subtitle: string } {
  const location = useLocation();
  const match = useMatch('/:portfolioId/*');
  const portfolioId = match?.params.portfolioId;
  const { data: portfolios = [] } = usePortfolios();
  const portfolio = portfolios.find((p) => String(p.portfolioId) === portfolioId);
  const name = portfolio?.portfolioName ?? 'Portfolio';

  const path = location.pathname;
  if (!portfolioId || path === '/') return { title: 'All Portfolios', subtitle: `${portfolios.length} portfolio${portfolios.length !== 1 ? 's' : ''}` };
  if (path.endsWith('/transactions'))    return { title: 'Transactions',       subtitle: name };
  if (path.endsWith('/dividends'))       return { title: 'Dividends',          subtitle: name };
  if (path.endsWith('/dividend-calendar')) return { title: 'Dividend Calendar', subtitle: name };
  if (path.endsWith('/diversification')) return { title: 'Diversification',    subtitle: name };
  if (path.endsWith('/performance'))     return { title: 'Performance',        subtitle: name };
  if (path.endsWith('/custom-assets'))   return { title: 'Custom Assets',      subtitle: name };
  return { title: name, subtitle: 'Holdings dashboard' };
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const { mutateAsync: createPortfolio, isPending } = useCreatePortfolio();
  const { title, subtitle } = usePageTitle();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { portfolioName: '', description: '' },
  });

  const onSubmit = async (data: FormValues) => {
    await createPortfolio(data);
    reset();
    setOpen(false);
  };

  const handleClose = () => { reset(); setOpen(false); };

  return (
    <header className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center gap-x-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 shadow-sm">
      {/* Mobile menu toggle */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-slate-500 dark:text-slate-400 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-5 w-5" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[18px] font-semibold text-slate-900 dark:text-white leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-none mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-semibold text-white hover:bg-primary-hover transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Portfolio
        </button>

        {/* Light/dark toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-0.5">
          <button
            onClick={!dark ? undefined : toggle}
            className={`p-1.5 rounded transition-colors ${!dark ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={dark ? undefined : toggle}
            className={`p-1.5 rounded transition-colors ${dark ? 'bg-slate-700 shadow-sm text-primary dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Bell */}
        <div className="relative">
          <button type="button" className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-md">
            <Bell className="h-5 w-5" />
          </button>
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
        </div>

        {/* Avatar */}
        <div
          className="flex items-center justify-center rounded-full text-white font-semibold text-sm flex-shrink-0"
          style={{ width: 32, height: 32, background: '#8B5CF6' }}
        >
          A
        </div>
      </div>

      <Dialog open={open} onClose={handleClose} title="Create New Portfolio">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Portfolio Name</label>
            <input
              autoFocus
              {...register('portfolioName')}
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="My Portfolio"
            />
            {errors.portfolioName && <p className="mt-1 text-xs text-red-600">{errors.portfolioName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <input
              {...register('description')}
              className="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Optional description"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={handleClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors">
              {isPending ? 'Creating…' : 'Create Portfolio'}
            </button>
          </div>
        </form>
      </Dialog>
    </header>
  );
}
