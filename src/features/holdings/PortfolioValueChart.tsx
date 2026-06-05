import { usePortfolioHistory } from '../../hooks/useHoldings';
import StackedAreaChart from '../../components/charts/AreaChart';
import Spinner from '../../components/ui/Spinner';

interface Props {
  portfolioId: string;
}

function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function PortfolioValueChart({ portfolioId }: Props) {
  const { data, isLoading } = usePortfolioHistory(portfolioId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const chartData = data.map((p) => ({
    date: formatMonthLabel(p.date),
    portfolioValue: p.portfolioValue,
  }));

  return (
    <StackedAreaChart
      data={chartData}
      xAxisKey="date"
      areas={[{ dataKey: 'portfolioValue', name: 'Portfolio Value' }]}
    />
  );
}
