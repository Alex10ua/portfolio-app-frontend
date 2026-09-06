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
  Cell,
  LabelList,
  type TooltipProps,
} from 'recharts';

interface AppBarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey?: string;
  color?: string;
  currencySymbol?: string;
  yFormatter?: (v: number) => string;
  tooltipContent?: TooltipProps<number, string>['content'];
  /** Per-bar color override; falls back to `color` when it returns undefined */
  getBarColor?: (entry: Record<string, unknown>, index: number) => string | undefined;
  /** Fires with the hovered row (whole category band, same as the tooltip), null on leave */
  onBarHover?: (entry: Record<string, unknown> | null) => void;
  /** Text drawn above one bar; return null/undefined to leave that bar unlabelled */
  getBarLabel?: (entry: Record<string, unknown>, index: number) => string | null | undefined;
}

export default function AppBarChart({
  data,
  xKey,
  yKey = 'amount',
  color = '#6366f1',
  currencySymbol = '$',
  yFormatter,
  tooltipContent,
  getBarColor,
  onBarHover,
  getBarLabel,
}: AppBarChartProps) {
  const fmtY = yFormatter ?? ((v: number) => `${currencySymbol}${v}`);
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
      <BarChart
        data={data}
        // bar labels are drawn above the bar, so the tallest one needs headroom
        margin={{ top: getBarLabel ? 22 : 5, right: 10, left: 0, bottom: 0 }}
        onMouseMove={
          onBarHover
            ? (state: { activeTooltipIndex?: number | string | null }) => {
                const raw = state?.activeTooltipIndex;
                const idx = raw == null ? -1 : Number(raw);
                onBarHover(Number.isInteger(idx) && idx >= 0 && data[idx] ? data[idx] : null);
              }
            : undefined
        }
        onMouseLeave={onBarHover ? () => onBarHover(null) : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          tickFormatter={fmtY}
        />
        <Tooltip
          content={tooltipContent}
          contentStyle={tooltipStyle}
          cursor={{ fill: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)' }}
          formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`]}
        />
        <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }} />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} name={`Amount (${currencySymbol})`}>
          {getBarColor &&
            data.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry, i) ?? color} />
            ))}
          {getBarLabel && (
            <LabelList
              dataKey={yKey}
              content={(props: { x?: number | string; y?: number | string; width?: number | string; index?: number }) => {
                const index = Number(props.index ?? -1);
                const entry = data[index];
                const text = entry ? getBarLabel(entry, index) : null;
                if (!text) return null;
                const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
                const y = Number(props.y ?? 0) - 6;
                return (
                  <text
                    x={x} y={y} textAnchor="middle"
                    fontSize={11} fontWeight={700}
                    fill={getBarColor?.(entry, index) ?? color}
                  >
                    {text}
                  </text>
                );
              }}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
