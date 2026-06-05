import { useParams } from 'react-router-dom';
import { PieChart } from 'lucide-react';
import { useDiversification } from '../../hooks/useDiversification';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import AppPieChart from '../../components/charts/PieChart';
import { formatCurrency } from '../../lib/formatters';

interface PieEntry { name: string; amount: number; }

function toPieData(data?: Record<string, number>): PieEntry[] {
  if (!data) return [];
  return Object.entries(data)
    .filter(([, amount]) => typeof amount === 'number' && amount > 0)
    .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(2)) }))
    .sort((a, b) => b.amount - a.amount);
}

function PieCard({ title, data }: { title: string; data: PieEntry[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</div>
        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">{formatCurrency(total)}</span>
      </div>
      <AppPieChart data={data} />
    </div>
  );
}

export default function DiversificationPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { data, isLoading, error } = useDiversification(portfolioId!);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading diversification" message={(error as Error).message} />;

  const cards: { title: string; data: PieEntry[] }[] = [
    { title: 'By Country',  data: toPieData(data?.amountByCountry)  },
    { title: 'By Sector',   data: toPieData(data?.amountBySector)   },
    { title: 'By Industry', data: toPieData(data?.amountByIndustry) },
    { title: 'By Stock',    data: toPieData(data?.amountByStock)    },
  ].filter((c) => c.data.length > 0);

  if (cards.length === 0) {
    return <EmptyState icon={PieChart} title="No diversification data" description="Add holdings to see your portfolio breakdown." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {cards.map((c) => (
          <PieCard key={c.title} title={c.title} data={c.data} />
        ))}
      </div>
    </div>
  );
}
