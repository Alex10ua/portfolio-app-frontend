import { useState } from 'react';
import { Menu, Plus, Bell, User, Sun, Moon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTheme } from '../../hooks/useTheme';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePortfolio } from '../../hooks/usePortfolios';
import Dialog from '../ui/Dialog';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const schema = z.object({
  portfolioName: z.string().min(1, 'Name is required'),
  description: z.string(),
});
type FormValues = z.infer<typeof schema>;

export default function Header({ setSidebarOpen }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const { mutateAsync: createPortfolio, isPending } = useCreatePortfolio();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { portfolioName: '', description: '' },
  });

  const onSubmit = async (data: FormValues) => {
    await createPortfolio(data);
    reset();
    setOpen(false);
  };

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/80 dark:bg-slate-900/80 dark:border-slate-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 backdrop-blur-md">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-slate-700 dark:text-slate-300 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hidden md:inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Plus className="-ml-0.5 h-5 w-5" />
            Create Portfolio
          </button>

          <button
            type="button"
            onClick={toggle}
            className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="sr-only">Toggle theme</span>
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500">
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" />
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>

      <Dialog open={open} onClose={handleClose} title="Create New Portfolio">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-slate-500">Enter the details below to create a new portfolio.</p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Portfolio Name</label>
            <input
              autoFocus
              {...register('portfolioName')}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="My Portfolio"
            />
            {errors.portfolioName && (
              <p className="mt-1 text-xs text-red-600">{errors.portfolioName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              {...register('description')}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Optional description"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              {isPending ? 'Creating…' : 'Create Portfolio'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
