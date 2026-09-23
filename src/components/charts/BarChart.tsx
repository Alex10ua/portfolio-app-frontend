import { useState, useEffect, useLayoutEffect, useRef, useCallback, cloneElement, createElement, isValidElement } from 'react';
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
  DefaultTooltipContent,
  usePlotArea,
  type TooltipProps,
  type TooltipContentProps,
} from 'recharts';

type TooltipContent = TooltipProps<number, string>['content'];
type Rect = { left: number; top: number; right: number; bottom: number };

/** Recharts' own default for a Bar, spelled out because AppBarChart times against it */
const BAR_ANIMATION_MS = 400;

/** Recharts' own rule for `content`: an element is cloned with the tooltip props, a function rendered with them. */
function renderTooltipContent(content: TooltipContent, props: TooltipContentProps<number, string>) {
  if (isValidElement(content)) return cloneElement(content, props);
  if (typeof content === 'function') return createElement(content, props);
  return <DefaultTooltipContent {...props} />;
}

/**
 * Top-left corner for a w×h tooltip near pointer `p` that covers none of `labels`
 * (nor the pointer). Candidates sit beside the pointer and flush against every
 * side of every label, kept inside the chart and above the x-axis (`floor`); the
 * clear one nearest the pointer wins, Recharts' usual spot — down-right of the
 * pointer — on a tie. One more spot is always clear: straight above the pointer
 * and every label in its way, even if that pokes out over the top of the chart.
 * Poking out covers the card's header instead, so it only wins when every
 * in-chart spot is taken or well away from the pointer.
 */
function clearSpot(p: { x: number; y: number }, w: number, h: number, labels: Rect[], width: number, floor: number) {
  const GAP = 10;
  const POKE_OUT_PENALTY = 60;
  const obstacles = [...labels, { left: p.x - 4, right: p.x + 4, top: p.y - 4, bottom: p.y + 4 }];
  const clampX = (x: number) => Math.max(0, Math.min(x, width - w));
  const clampY = (y: number) => Math.max(0, Math.min(y, floor - h));
  const covers = (left: number, top: number) => obstacles.some((r) =>
    left < r.right && r.left < left + w && top < r.bottom && r.top < top + h);
  // Chebyshev distance from the pointer to the box, so every spot touching it scores alike
  const reach = (left: number, top: number) => Math.max(
    left - p.x, p.x - (left + w), top - p.y, p.y - (top + h), 0);

  const xs = [p.x + GAP, p.x - GAP - w, p.x - w / 2, ...labels.flatMap((l) => [l.right, l.left - w])];
  const ys = [p.y + GAP, p.y - GAP - h, 0, floor - h, ...labels.flatMap((l) => [l.bottom, l.top - h])];
  const upLeft = clampX(p.x - w / 2);
  const inWay = labels.filter((l) => l.left < upLeft + w && upLeft < l.right);
  const upTop = Math.min(p.y - GAP, ...inWay.map((l) => l.top)) - h;
  let best = { left: upLeft, top: upTop, score: reach(upLeft, upTop) + (upTop < 0 ? POKE_OUT_PENALTY : 0) };
  xs.forEach((x, i) => ys.forEach((y, j) => {
    const left = clampX(x);
    const top = clampY(y);
    if (covers(left, top)) return;
    const score = reach(left, top) + (i + j) * 1e-3;
    if (score < best.score) best = { left, top, score };
  }));
  return { left: Math.round(best.left), top: Math.round(best.top) };
}

/**
 * Tooltip that keeps clear of the bar labels. Recharts parks its box just off
 * the pointer, which lands it on the amounts above the lit bars whenever the
 * pointer is near their tops. Here the Tooltip wrapper is pinned to the chart's
 * corner (`position={{ x: 0, y: 0 }}`) and this box places itself inside it.
 * Its own prop is `body`, not `content`: Recharts clones the element with every
 * Tooltip prop, `content` included, which would overwrite it.
 */
function LabelClearTooltip({ body, ...props }: Partial<TooltipContentProps<number, string>> & { body: TooltipContent }) {
  const { active, coordinate } = props;
  const ref = useRef<HTMLDivElement>(null);
  const plot = usePlotArea();
  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null);
  // Read by the observer below, which outlives any one render
  const latest = useRef({ active, coordinate, plot });

  const place = useCallback(() => {
    const box = ref.current;
    const chart = box?.closest('.recharts-wrapper');
    const { active, coordinate, plot } = latest.current;
    if (!box || !chart || !active || !coordinate || !plot) return;
    const origin = chart.getBoundingClientRect();
    const labels = Array.from(chart.querySelectorAll('text.bar-label'), (el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left - origin.left - 3, right: r.right - origin.left + 3,
        top: r.top - origin.top - 3, bottom: r.bottom - origin.top + 3,
      };
    });
    const next = clearSpot(coordinate, box.offsetWidth, box.offsetHeight, labels, origin.width, plot.y + plot.height);
    // an unchanged spot keeps the same object, so React skips the re-render
    setSpot((prev) => (prev?.left === next.left && prev?.top === next.top ? prev : next));
  }, []);

  // Every render: the pointer moved, or the box changed size with its content
  useLayoutEffect(() => {
    latest.current = { active, coordinate, plot };
    place();
  });

  // Hovering lights a new group of labels, and Recharts can commit those after
  // this tooltip has already been placed against the old ones — place it again
  // when they land (and when a resize moves them).
  useEffect(() => {
    const svg = ref.current?.closest('.recharts-wrapper')?.querySelector('svg');
    if (!svg) return;
    const observer = new MutationObserver(place);
    observer.observe(svg, { subtree: true, childList: true, characterData: true, attributeFilter: ['x', 'y'] });
    return () => observer.disconnect();
  }, [place]);

  return (
    <div
      ref={ref}
      // max-content: the pinned wrapper is 0 px wide, which would squeeze the box to one word per line
      style={{ position: 'absolute', left: spot?.left ?? 0, top: spot?.top ?? 0, width: 'max-content',
        visibility: spot ? undefined : 'hidden' }}
    >
      {/* the element is written without tooltip props — Recharts fills them in when it clones it */}
      {renderTooltipContent(body, props as TooltipContentProps<number, string>)}
    </div>
  );
}

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
  /**
   * Text drawn above one bar; return null/undefined to leave that bar unlabelled.
   * With labels on, the tooltip places itself where it covers none of them.
   */
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
  // Recharts restarts a Bar's animation whenever its props change — every hover
  // recolour included — and holds the labels back until it ends, so they trailed
  // the pointer by ~0.4 s (and the tooltip was placed before they existed).
  // Animate the first draw only. An animation Recharts cuts short to restart also
  // reports its end, so only one that ran its full length counts as the first draw.
  const [drawn, setDrawn] = useState(false);
  const animationStartedAt = useRef(0);
  const onAnimationStart = useCallback(() => { animationStartedAt.current = performance.now(); }, []);
  const onAnimationEnd = useCallback(() => {
    if (performance.now() - animationStartedAt.current >= BAR_ANIMATION_MS * 0.9) setDrawn(true);
  }, []);

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
          content={getBarLabel ? <LabelClearTooltip body={tooltipContent} /> : tooltipContent}
          position={getBarLabel ? { x: 0, y: 0 } : undefined}
          contentStyle={tooltipStyle}
          cursor={{ fill: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)' }}
          formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`]}
        />
        <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }} />
        <Bar
          dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} name={`Amount (${currencySymbol})`}
          isAnimationActive={!drawn} animationDuration={BAR_ANIMATION_MS}
          onAnimationStart={onAnimationStart} onAnimationEnd={onAnimationEnd}
        >
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
                    // LabelClearTooltip finds the labels to steer around by this class
                    className="bar-label"
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
