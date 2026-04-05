import { PieChart, Pie, Sector, ResponsiveContainer, Cell } from 'recharts';
import { useState, useEffect } from 'react';

interface PieDataItem {
  name: string;
  amount: number;
}

interface AppPieChartProps {
  data: PieDataItem[];
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981',
  '#f59e0b', '#ef4444', '#14b8a6', '#f97316', '#a855f7',
  '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
  '#22c55e', '#f43f5e', '#f472b6', '#fb923c', '#a3e635',
];

function makeActiveShape(isDark: boolean) {
  return function ActiveShape(props: Record<string, unknown>) {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, amount,
    } = props as {
      cx: number; cy: number; innerRadius: number; outerRadius: number;
      startAngle: number; endAngle: number; fill: string;
      payload: { name: string }; percent: number; amount: number;
    };

    const labelColor = isDark ? '#f1f5f9' : '#1e293b';
    const subColor   = isDark ? '#94a3b8' : '#64748b';

    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14} fill={fill} />
        <text x={cx} y={cy - 14} textAnchor="middle" fill={labelColor} fontSize={12} fontWeight={600}>
          {payload.name.length > 12 ? payload.name.slice(0, 12) + '…' : payload.name}
        </text>
        <text x={cx} y={cy + 6} textAnchor="middle" fill={fill} fontSize={14} fontWeight={700}>
          {`$${typeof amount === 'number' ? amount.toFixed(2) : 'N/A'}`}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" fill={subColor} fontSize={11}>
          {`${(percent * 100).toFixed(1)}%`}
        </text>
      </g>
    );
  };
}

export default function AppPieChart({ data, colors = DEFAULT_COLORS }: AppPieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Clamp activeIndex when data length shrinks
  useEffect(() => {
    if (data.length > 0 && activeIndex >= data.length) {
      setActiveIndex(data.length - 1);
    }
  }, [data, activeIndex]);

  if (!data.length) {
    return <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data available</div>;
  }

  const total = data.reduce((s, d) => s + d.amount, 0);
  const safeIndex = Math.min(activeIndex, data.length - 1);
  const activeShape = makeActiveShape(isDark);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4">
      <div className="w-full lg:flex-1 min-w-0" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Pie
              {...({ activeIndex: safeIndex } as any)}
              activeShape={activeShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              dataKey="amount"
              nameKey="name"
              onMouseEnter={(_, index) => setActiveIndex(index)}
            >
              {data.map((item) => (
                <Cell key={item.name} fill={colors[data.indexOf(item) % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 w-full lg:w-auto lg:min-w-[160px] max-h-64 overflow-y-auto pr-1">
        {data.map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center gap-2 text-xs cursor-pointer rounded px-1 py-0.5 transition-colors ${
              i === safeIndex
                ? 'bg-slate-100 dark:bg-slate-700'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            onMouseEnter={() => setActiveIndex(i)}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.name}</span>
            <span className={`ml-auto shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {((item.amount / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
