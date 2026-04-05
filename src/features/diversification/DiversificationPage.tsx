import { useParams } from 'react-router-dom';
import { PieChart } from 'lucide-react';
import { useDiversification } from '../../hooks/useDiversification';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import AppPieChart from '../../components/charts/PieChart';

interface PieEntry { name: string; amount: number; }

function toPieData(data?: Record<string, number>): PieEntry[] {
  if (!data) return [];
  return Object.entries(data).map(([name, amount]) => ({
    name,
    amount: typeof amount === 'number' ? parseFloat(amount.toFixed(2)) : 0,
  }));
}

function PieCard({ title, data }: { title: string; data: PieEntry[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm rounded-lg border border-slate-100 dark:border-slate-800 p-6">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{title}</h3>
      <AppPieChart data={data} />
    </div>
  );
}

export default function DiversificationPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { data, isLoading, error } = useDiversification(portfolioId!);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading diversification" message={(error as Error).message} />;
  if (!data || (!data.amountByCountry && !data.amountBySector && !data.amountByIndustry && !data.amountByStock)) {
    return <EmptyState icon={PieChart} title="No diversification data" description="Add holdings to see your portfolio breakdown." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Portfolio Diversification</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PieCard title="By Country" data={toPieData(data.amountByCountry)} />
        <PieCard title="By Sector" data={toPieData(data.amountBySector)} />
        <PieCard title="By Industry" data={toPieData(data.amountByIndustry)} />
        <PieCard title="By Stock" data={toPieData(data.amountByStock)} />
      </div>
    </div>
  );
}
