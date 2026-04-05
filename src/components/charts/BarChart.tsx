import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';

interface AppBarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey?: string;
  color?: string;
  yFormatter?: (v: number) => string;
  tooltipContent?: TooltipProps<number, string>['content'];
}

export default function AppBarChart({
  data,
  xKey,
  yKey = 'amount',
  color = '#6366f1',
  yFormatter = (v) => `$${v}`,
  tooltipContent,
}: AppBarChartProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const tooltipStyle = isDark
    ? { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 13, color: '#f1f5f9' }
    : { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 13 };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          tickFormatter={yFormatter}
        />
        <Tooltip
          content={tooltipContent}
          contentStyle={tooltipStyle}
          cursor={{ fill: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)' }}
          formatter={(value: number) => [`$${value.toFixed(2)}`]}
        />
        <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} name="Amount ($)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
