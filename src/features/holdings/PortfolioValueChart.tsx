import { usePortfolioHistory } from '../../hooks/useHoldings';
import { useFxRates } from '../../hooks/useFxRates';
import { convertMap, currencyMeta } from '../../lib/currency';
import StackedAreaChart from '../../components/charts/AreaChart';
import Spinner from '../../components/ui/Spinner';
import type { CurrencyDisplay } from '../../types/settings';

interface Props {
  portfolioId: string;
  /** Month key 'YYYY-MM' — points before it are hidden. Omit for full range. */
  startMonth?: string;
  /** currency the series is converted to; the backend sends native amounts */
  baseCurrency?: string;
  currencyDisplay?: CurrencyDisplay;
}

function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function PortfolioValueChart({ portfolioId, startMonth, baseCurrency, currencyDisplay = 'Symbol' }: Props) {
  const { data, isLoading } = usePortfolioHistory(portfolioId);
  const fxRates = useFxRates();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const target = baseCurrency || 'USD';
  const meta = currencyMeta(target);
  const label = currencyDisplay === 'Code'
    ? `Portfolio Value (${meta.code})`
    : `Portfolio Value (${meta.symbol.trim()})`;

  const visiblePoints = data.filter((p) => !startMonth || p.date.slice(0, 7) >= startMonth);
  const estimatedTickers = [...new Set(visiblePoints.flatMap((point) => point.estimatedPriceTickers ?? []))];
  const chartData = visiblePoints
    .map((p) => ({
      date: formatMonthLabel(p.date),
      // valueByCurrency holds each quote currency's own total — convert, then sum.
      // Responses without it predate the split and are already a single currency.
      portfolioValue: p.valueByCurrency
        ? convertMap(p.valueByCurrency, target, fxRates)
        : p.portfolioValue,
    }));

  return (
    <div className="h-full flex flex-col">
      {estimatedTickers.length > 0 && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-2">
          Estimated history: {estimatedTickers.join(', ')}. Refresh their price history to update these values.
        </p>
      )}
      <div className="flex-1 min-h-0">
        <StackedAreaChart
          data={chartData}
          xAxisKey="date"
          areas={[{ dataKey: 'portfolioValue', name: label }]}
        />
      </div>
    </div>
  );
}
