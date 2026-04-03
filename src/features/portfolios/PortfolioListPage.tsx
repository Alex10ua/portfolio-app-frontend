import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, FolderOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePortfolios, useCreatePortfolio } from '../../hooks/usePortfolios';
import Dialog from '../../components/ui/Dialog';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';

const schema = z.object({
  portfolioName: z.string().min(1, 'Name is required'),
  description: z.string(),
});
type FormValues = z.infer<typeof schema>;

export default function PortfolioListPage() {
  const [open, setOpen] = useState(false);
  const { data: portfolios = [], isLoading, error } = usePortfolios();
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

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading portfolios" message={(error as Error).message} />;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">My Portfolios</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 md:mt-0 inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="-ml-0.5 h-5 w-5" />
          Create New Portfolio
        </button>
      </div>

      {portfolios.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No portfolios yet"
          description="Create your first portfolio to get started."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => (
            <div
              key={portfolio.portfolioId}
              className="col-span-1 divide-y divide-slate-200 dark:divide-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-800"
            >
              <div className="flex w-full items-center justify-between space-x-6 p-6">
                <div className="flex-1 truncate">
                  <h3 className="truncate text-lg font-medium text-slate-900 dark:text-white">
                    {portfolio.portfolioName}
                  </h3>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {portfolio.description || 'No description provided'}
                  </p>
                </div>
                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {portfolio.portfolioName.charAt(0).toUpperCase()}
                </div>
              </div>
              <div>
                <Link
                  to={`/${portfolio.portfolioId}`}
                  className="relative inline-flex w-full items-center justify-center gap-x-3 rounded-b-lg border border-transparent py-4 text-sm font-semibold text-slate-900 dark:text-slate-200 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  View Dashboard
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => { reset(); setOpen(false); }} title="Create New Portfolio">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-slate-500">Enter the details to create a new portfolio.</p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Portfolio Name</label>
            <input
              autoFocus
              {...register('portfolioName')}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="My Portfolio"
            />
            {errors.portfolioName && <p className="mt-1 text-xs text-red-600">{errors.portfolioName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              {...register('description')}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Optional"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { reset(); setOpen(false); }}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {isPending ? 'Creating…' : 'Create Portfolio'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
