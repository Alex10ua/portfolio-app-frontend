import {
  Area, ComposedChart, Label, Line, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { formatMonth, percentileYield, type YieldStats } from './yieldMath';

interface Props {
  stats: YieldStats;
  targetYield: number | null;
  threshold: number;
  height?: number;
}

/**
 * Monthly forward yield with the distribution drawn on top: grey band = 25th–75th,
 * dashed line = median, green = the percentile floor being screened on, indigo =
 * the user's target. The point of the chart is where the line sits between them.
 */
export default function YieldHistoryChart({ stats, targetYield, threshold, height = 232 }: Props) {
  const { dark } = useTheme();
  const bandValue = percentileYield(stats, Math.max(threshold, 1));
  const data = stats.window.map((p) => ({ month: p.month, yield: p.yield }));

  const axis = dark ? '#64748b' : '#94a3b8';
  const grid = dark ? '#334155' : '#e2e8f0';
  const line = dark ? '#60a5fa' : '#2563eb';
  const gain = dark ? '#34d399' : '#059669';
  const text = dark ? '#f1f5f9' : '#0f172a';

  const values = data.map((d) => d.yield);
  const lo = Math.min(...values, stats.current, targetYield ?? Infinity) * 0.93;
  const hi = Math.max(...values, stats.current, targetYield ?? 0) * 1.05;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 46, bottom: 4, left: 0 }}>
        <ReferenceArea y1={stats.p25} y2={stats.p75} fill={axis} fillOpacity={dark ? 0.12 : 0.14} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: axis }}
          tickLine={false}
          axisLine={{ stroke: grid }}
          minTickGap={44}
          tickFormatter={(m: string) => m.slice(0, 4)}
        />
        <YAxis
          domain={[lo, hi]}
          tick={{ fontSize: 10, fill: axis }}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => `${v.toFixed(1)}%`}
        />
        <Tooltip
          contentStyle={dark
            ? { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12.5, color: text }
            : { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12.5, color: text }}
          labelStyle={{ color: text, fontWeight: 600 }}
          itemStyle={{ color: text }}
          labelFormatter={(m: string) => formatMonth(m)}
          formatter={(v: number) => [`${v.toFixed(2)}%`, 'TTM yield']}
        />
        <ReferenceLine y={stats.median} stroke={axis} strokeDasharray="5 4">
          <Label value={`median ${stats.median.toFixed(2)}%`} position="right" fontSize={10} fill={axis} />
        </ReferenceLine>
        <ReferenceLine y={bandValue} stroke={gain} strokeDasharray="2 3">
          <Label value={`${threshold || 90}th ${bandValue.toFixed(2)}%`} position="right" fontSize={10} fill={gain} />
        </ReferenceLine>
        {targetYield != null && targetYield > 0 && (
          <ReferenceLine y={targetYield} stroke="#6366f1" strokeWidth={1.4} strokeDasharray="7 4">
            <Label value={`TARGET ${targetYield.toFixed(2)}%`} position="insideTopLeft" fontSize={10} fill="#6366f1" />
          </ReferenceLine>
        )}
        <Area type="monotone" dataKey="yield" stroke="none" fill={line} fillOpacity={dark ? 0.1 : 0.07} />
        <Line type="monotone" dataKey="yield" stroke={line} strokeWidth={1.6} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
