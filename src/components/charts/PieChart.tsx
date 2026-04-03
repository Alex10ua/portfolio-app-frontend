import { PieChart, Pie, Sector, ResponsiveContainer, Cell } from 'recharts';
import { useState } from 'react';

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
];

const renderActiveShape = (props: Record<string, unknown>) => {
  const RADIAN = Math.PI / 180;
  const {
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, amount,
  } = props as {
    cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number;
    startAngle: number; endAngle: number; fill: string;
    payload: { name: string }; percent: number; amount: number;
  };

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontSize={13} fontWeight={600}>
        {`$${typeof amount === 'number' ? amount.toFixed(2) : 'N/A'}`}
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" fontSize={12}>
        {payload.name}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={16} textAnchor={textAnchor} fill="#999" fontSize={11}>
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

export default function AppPieChart({ data, colors = DEFAULT_COLORS }: AppPieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!data.length) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data available</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4 h-full">
      <div className="flex-1 h-80 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Pie
              {...({ activeIndex } as any)}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              dataKey="amount"
              nameKey="name"
              onMouseEnter={(_, index) => setActiveIndex(index)}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 min-w-[140px] max-h-72 overflow-y-auto pr-1">
        {data.map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center gap-2 text-xs cursor-pointer rounded px-1 py-0.5 ${i === activeIndex ? 'bg-slate-100' : ''}`}
            onMouseEnter={() => setActiveIndex(i)}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="text-slate-700 truncate">{item.name}</span>
            <span className="ml-auto text-slate-500 shrink-0">{((item.amount / data.reduce((s, d) => s + d.amount, 0)) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
