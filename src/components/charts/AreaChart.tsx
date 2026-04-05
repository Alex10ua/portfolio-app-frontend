import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AreaDef {
  dataKey: string;
  name: string;
}

interface StackedAreaChartProps {
  data: Record<string, unknown>[];
  xAxisKey: string;
  areas: AreaDef[];
  colors?: string[];
}

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6'];

export default function StackedAreaChart({
  data,
  xAxisKey,
  areas,
  colors = DEFAULT_COLORS,
}: StackedAreaChartProps) {
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
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {areas.map((area, i) => (
            <linearGradient key={area.dataKey} id={`gradient-${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
        <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`$${value.toFixed(2)}`]}
        />
        <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }} />
        {areas.map((area, i) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            name={area.name}
            stroke={colors[i % colors.length]}
            fill={`url(#gradient-${area.dataKey})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
