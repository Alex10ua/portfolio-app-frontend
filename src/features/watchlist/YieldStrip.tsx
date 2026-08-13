import { useTheme } from '../../hooks/useTheme';
import { ordinal, percentileYield, type YieldStats } from './yieldMath';

interface Props {
  stats: YieldStats;
  width?: number;
  /** Percentile above which the strip shades green — the "cheap" band. */
  threshold?: number;
}

/**
 * Where today's yield sits in the ticker's own distribution, in one 22px row.
 *
 * Track spans the window's min→max. The green tail is everything at or above the
 * threshold percentile, the darker block is the 25th–75th, the hairline is the
 * median, and the solid marker is today.
 */
export default function YieldStrip({ stats, width = 132, threshold = 90 }: Props) {
  const { dark } = useTheme();
  const H = 22;
  const pad = 3;

  const lo0 = Math.min(stats.min, stats.current);
  const hi0 = Math.max(stats.max, stats.current);
  const span = hi0 - lo0 || 1;
  const lo = lo0 - span * 0.07;
  const hi = hi0 + span * 0.07;
  const x = (v: number) => pad + ((v - lo) / (hi - lo)) * (width - pad * 2);

  const bandStart = percentileYield(stats, threshold);
  const inBand = stats.percentile >= threshold;

  return (
    <svg width={width} height={H} className="block">
      <rect x={pad} y={H / 2 - 3} width={width - pad * 2} height={6} rx={3}
            fill={dark ? 'rgba(148,163,184,0.20)' : '#E2E8F0'} />
      <rect x={x(bandStart)} y={H / 2 - 3} width={Math.max(2, x(hi) - x(bandStart))} height={6} rx={3}
            fill={dark ? 'rgba(52,211,153,0.30)' : 'rgba(5,150,105,0.22)'} />
      <rect x={x(stats.p25)} y={H / 2 - 3} width={Math.max(1, x(stats.p75) - x(stats.p25))} height={6}
            fill={dark ? 'rgba(148,163,184,0.34)' : '#CBD5E1'} />
      <rect x={x(stats.median) - 0.75} y={H / 2 - 7} width={1.5} height={14}
            fill={dark ? '#64748b' : '#94a3b8'} />
      <rect x={Math.min(width - pad - 3, Math.max(pad, x(stats.current) - 1.5))} y={2} width={3} height={H - 4} rx={1.5}
            fill={inBand ? (dark ? '#34d399' : '#059669') : (dark ? '#94a3b8' : '#64748b')} />
    </svg>
  );
}

/** "93rd" — the percentile, colored by how rich it is. */
export function PercentileCell({ percentile }: { percentile: number }) {
  const color =
    percentile >= 90 ? 'text-green-600 dark:text-green-400'
      : percentile >= 75 ? 'text-blue-600 dark:text-blue-400'
        : percentile <= 25 ? 'text-slate-400 dark:text-slate-500'
          : 'text-slate-500 dark:text-slate-400';
  return (
    <span className={`inline-flex items-baseline gap-px font-bold tabular-nums ${color}`}>
      <span className="text-[14px]">{percentile >= 99.5 ? '99+' : percentile.toFixed(0)}</span>
      {percentile < 99.5 && (
        <span className="text-[9.5px] font-semibold opacity-75">{ordinal(percentile)}</span>
      )}
    </span>
  );
}
