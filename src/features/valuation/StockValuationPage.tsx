import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Menu as HMenu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChevronDown, Minus, Plus, Calculator as CalculatorIcon } from 'lucide-react';
import { useHoldings } from '../../hooks/useHoldings';
import { useFundamentals } from '../../hooks/useFundamentals';
import { FullPageSpinner } from '../../components/ui/Spinner';
import Spinner from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import StockLogo from '../../components/ui/StockLogo';
import StackedAreaChart from '../../components/charts/AreaChart';
import { useTheme } from '../../hooks/useTheme';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../../lib/formatters';
import type { Holding } from '../../types/holding';
import type { FundamentalEntry } from '../../types/fundamentals';

// ---------- DCF MODEL ----------
// All assumptions (starting FCF/share, growth, exit P/FCF, target return) are
// user-entered and kept client-side only — there is no backend concept for
// free-cash-flow yet (SEC EDGAR fundamentals cover revenue/netIncome/eps/etc,
// see sec_edgar_provider.py FUNDAMENTAL_CONCEPTS, but not operating cash flow
// or capex). See TODO.list for adding a real FCF data source.
const HORIZON = 5;

// Each metric (Revenue/Net Income/Gross Profit/Op. Income/FCF) is an independent
// multiple-based valuation, not just a relabeled FCF model — own starting
// per-share value, own growth rate, own exit multiple, all kept separately.
const METRICS = [
  { key: 'revenue', label: 'Revenue', color: '#3B82F6', ratioAbbr: 'P/S', startLabel: 'Revenue Per Share',
    note: 'Not recommended for profitable stocks.', defaultGrowth: 15, defaultRatio: 5 },
  { key: 'net', label: 'Net Income', color: '#06B6D4', ratioAbbr: 'P/E', startLabel: 'EPS (Diluted)',
    note: undefined as string | undefined, defaultGrowth: 12, defaultRatio: 20 },
  { key: 'gross', label: 'Gross Profit', color: '#F43F5E', ratioAbbr: 'P/GP', startLabel: 'Gross Profit Per Share',
    note: undefined as string | undefined, defaultGrowth: 12, defaultRatio: 10 },
  { key: 'op', label: 'Op. Income', color: '#F59E0B', ratioAbbr: 'P/OI', startLabel: 'Op. Income Per Share',
    note: undefined as string | undefined, defaultGrowth: 12, defaultRatio: 15 },
  { key: 'fcf', label: 'FCF', color: '#10B981', ratioAbbr: 'P/FCF', startLabel: 'FCF Per Share',
    note: undefined as string | undefined, defaultGrowth: 12, defaultRatio: 20 },
] as const;
type MetricKey = typeof METRICS[number]['key'];

interface MetricAssumptions { start: number; growth: number; ratio: number }
interface Assumptions { targetReturn: number; metrics: Record<MetricKey, MetricAssumptions> }

const DEFAULT_ASSUMPTIONS: Assumptions = {
  targetReturn: 10,
  metrics: Object.fromEntries(
    METRICS.map((m) => [m.key, { start: 0, growth: m.defaultGrowth, ratio: m.defaultRatio }]),
  ) as Record<MetricKey, MetricAssumptions>,
};

function assumptionsKey(ticker: string) {
  return `valuationAssumptions:${ticker}`;
}
function loadAssumptions(ticker: string): Assumptions {
  try {
    const raw = localStorage.getItem(assumptionsKey(ticker));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.metrics) {
        // per-metric deep merge so entries saved under an older schema pick up
        // defaults for any field added later
        const metrics = Object.fromEntries(
          METRICS.map((m) => [m.key, { ...DEFAULT_ASSUMPTIONS.metrics[m.key], ...(parsed.metrics[m.key] ?? {}) }]),
        ) as Record<MetricKey, MetricAssumptions>;
        return {
          targetReturn: parsed.targetReturn ?? DEFAULT_ASSUMPTIONS.targetReturn,
          metrics,
        };
      }
    }
  } catch {
    // ignore malformed localStorage payload, fall back to defaults
  }
  return DEFAULT_ASSUMPTIONS;
}
function saveAssumptions(ticker: string, a: Assumptions) {
  localStorage.setItem(assumptionsKey(ticker), JSON.stringify(a));
}

function computeValuation({ livePrice, start, growth, ratio, targetReturn }: {
  livePrice: number; start: number; growth: number; ratio: number; targetReturn: number;
}) {
  const valueAtSale = start * Math.pow(1 + growth / 100, HORIZON);
  const futureValue = valueAtSale * ratio;
  const intrinsic = futureValue / Math.pow(1 + targetReturn / 100, HORIZON);
  const cagr = livePrice > 0 ? (Math.pow(futureValue / Math.max(livePrice, 0.01), 1 / HORIZON) - 1) * 100 : 0;
  const overUnder = intrinsic !== 0 ? ((livePrice - intrinsic) / intrinsic) * 100 : 0;
  return { valueAtSale, futureValue, intrinsic, cagr, overUnder };
}

function buildProjection(start: number, growth: number, div0: number) {
  const startYear = new Date().getFullYear();
  const divGrowth = Math.min(growth, 8);
  return Array.from({ length: HORIZON + 1 }, (_, i) => {
    const value = start * Math.pow(1 + growth / 100, i);
    const div = Math.max(0, Math.min(div0 * Math.pow(1 + divGrowth / 100, i), value * 0.6));
    return { year: startYear + i, value, div, valueRemainder: Math.max(0, value - div) };
  });
}

function pnlTextColor(value: number) {
  return value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';
}

// ---------- STARTING-VALUE INPUT ----------
// Text state is kept locally so partial entries like "0." survive the keystroke —
// echoing each keystroke through Number() (value={n || ''}) ate the "0." prefix
// and made values under 1 impossible to type.
function StartValueInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(value > 0 ? String(value) : '');

  // Sync in externally-changed values (ticker/metric switch, async EPS prefill)
  // without clobbering in-progress typing: skip when the text already parses to
  // the committed value.
  useEffect(() => {
    const parsed = Number(text);
    if ((Number.isFinite(parsed) ? parsed : 0) !== value) {
      setText(value > 0 ? String(value) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    const parsed = Number(raw);
    onCommit(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  };

  return (
    <input
      type="number"
      step="any"
      min="0"
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="e.g. 4.62"
      className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );
}

// ---------- STEPPER ----------
function Stepper({ color, label, hint, value, onChange, min, max, step = 1, suffix }: {
  color: string; label: string; hint?: string; value: number;
  onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{label}</span>
      </div>
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-10 h-10 flex-shrink-0 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center border-b-2 border-slate-300 dark:border-slate-600 pb-1">
          <span className="text-[26px] font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">{value}</span>
          {suffix && <span className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 ml-0.5">{suffix}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-10 h-10 flex-shrink-0 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {hint && <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-2">{hint}</div>}
    </div>
  );
}

// ---------- KPI ----------
function Kpi({ label, value, sub, subClass, big }: {
  label: string; value: string; sub?: string; subClass?: string; big?: boolean;
}) {
  return (
    <div className="flex-1 text-center px-2">
      <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2">{label}</div>
      <div className={`${big ? 'text-[32px]' : 'text-[24px]'} font-bold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none`}>
        {value}
      </div>
      {sub && <div className={`text-[13px] font-semibold mt-1.5 ${subClass ?? 'text-slate-500 dark:text-slate-400'}`}>{sub}</div>}
    </div>
  );
}

// ---------- HOLDING SELECTOR ----------
function HoldingSelector({ holdings, holding, currency, onSelect }: {
  holdings: Holding[]; holding: Holding; currency: string; onSelect: (ticker: string) => void;
}) {
  return (
    <HMenu as="div" className="relative">
      <MenuButton className="flex items-center gap-3 pl-2.5 pr-3 py-1.5 min-w-[300px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
        <StockLogo ticker={holding.ticker} name={holding.name} assetType={holding.assetType} size="sm" />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums">{holding.ticker}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{holding.name}</div>
        </div>
        <div className="text-right mr-1">
          <div className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(holding.currentShareValue, 2, currency)}
          </div>
          {holding.totalProfitPercentage != null && (
            <div className={`text-[11px] font-semibold tabular-nums ${pnlTextColor(holding.totalProfitPercentage)}`}>
              {formatPercent(holding.totalProfitPercentage, 1)}
            </div>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
      </MenuButton>
      <MenuItems
        anchor="bottom start"
        className="z-40 mt-1.5 w-[360px] max-h-[340px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg focus:outline-none"
      >
        <div className="px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
          Stock holdings · {holdings.length}
        </div>
        {holdings.map((h) => {
          const active = h.ticker === holding.ticker;
          return (
            <MenuItem key={h.ticker}>
              <button
                onClick={() => onSelect(h.ticker)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left ${
                  active ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'data-[focus]:bg-slate-50 dark:data-[focus]:bg-slate-700/50'
                }`}
              >
                <StockLogo ticker={h.ticker} name={h.name} assetType={h.assetType} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className={`text-[12.5px] font-bold tabular-nums ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                    {h.ticker}
                  </div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">{h.name}</div>
                </div>
                <div className="text-[12px] font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(h.currentShareValue, 2, h.currency ?? 'USD')}
                </div>
                {h.totalProfitPercentage != null && (
                  <div className={`text-[11px] font-semibold tabular-nums w-[54px] text-right ${pnlTextColor(h.totalProfitPercentage)}`}>
                    {formatPercent(h.totalProfitPercentage, 1)}
                  </div>
                )}
              </button>
            </MenuItem>
          );
        })}
      </MenuItems>
    </HMenu>
  );
}

// ---------- PROJECTION CHART ----------
function ValuationChart({ series, color, metricLabel, currency, isDark }: {
  series: ReturnType<typeof buildProjection>; color: string; metricLabel: string; currency: string; isDark: boolean;
}) {
  const tooltipStyle = isDark
    ? { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 13, color: '#f1f5f9' }
    : { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 13 };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }}
          tickFormatter={(v: number) => formatCurrency(v, 0, currency)} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string, item) => {
            if (name === 'Dividends') return [formatCurrency(value, 2, currency), name];
            const total = (item.payload as { value: number }).value;
            return [formatCurrency(total, 2, currency), `${metricLabel} Per Share`];
          }}
        />
        <Bar dataKey="div" stackId="a" name="Dividends" fill="#8B5CF6" />
        <Bar dataKey="valueRemainder" stackId="a" name={metricLabel} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------- VALUATION TAB ----------
function ValuationTab({ holding, currency }: { holding: Holding; currency: string }) {
  const { dark } = useTheme();
  const [metric, setMetric] = useState<MetricKey>('fcf');
  const [assumptions, setAssumptions] = useState<Assumptions>(() => loadAssumptions(holding.ticker));
  const { data: fundamentals } = useFundamentals(holding.ticker);

  useEffect(() => {
    setAssumptions(loadAssumptions(holding.ticker));
  }, [holding.ticker]);

  // Net Income is the one metric with a real data source already on hand —
  // prefill its starting value from the latest annual diluted EPS the first
  // time this ticker is opened (never overwrites a value the user set).
  useEffect(() => {
    const epsSeries = fundamentals?.concepts?.epsDiluted;
    if (!epsSeries?.length) return;
    const latest = [...epsSeries].filter((e) => e.form?.startsWith('10-K')).sort((a, b) => a.date.localeCompare(b.date)).pop();
    // negative/zero EPS (loss-making company) is useless as a multiple base —
    // prefilling it would persist junk and re-trigger on every visit
    if (!latest || latest.value <= 0) return;
    setAssumptions((prev) => {
      if (prev.metrics.net.start > 0) return prev;
      const next = { ...prev, metrics: { ...prev.metrics, net: { ...prev.metrics.net, start: latest.value } } };
      saveAssumptions(holding.ticker, next);
      return next;
    });
  }, [fundamentals, holding.ticker]);

  const updateMetric = (key: MetricKey, patch: Partial<MetricAssumptions>) => {
    setAssumptions((prev) => {
      const next = { ...prev, metrics: { ...prev.metrics, [key]: { ...prev.metrics[key], ...patch } } };
      saveAssumptions(holding.ticker, next);
      return next;
    });
  };
  const updateTargetReturn = (v: number) => {
    setAssumptions((prev) => {
      const next = { ...prev, targetReturn: v };
      saveAssumptions(holding.ticker, next);
      return next;
    });
  };

  const livePrice = holding.currentShareValue ?? 0;
  const div0 = holding.dividend ?? 0;
  const metricMeta = METRICS.find((m) => m.key === metric)!;
  const active = assumptions.metrics[metric];

  const series = useMemo(
    () => buildProjection(active.start, active.growth, div0),
    [active.start, active.growth, div0],
  );
  const { futureValue, intrinsic, cagr, overUnder } = computeValuation({
    livePrice, start: active.start, growth: active.growth, ratio: active.ratio, targetReturn: assumptions.targetReturn,
  });
  const over = overUnder >= 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
      {/* LEFT — KPIs + chart */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {active.start <= 0 ? (
          <div className="p-5">
            <EmptyState
              icon={CalculatorIcon}
              title={`Enter a starting ${metricMeta.startLabel} to model this stock`}
              description={`No automated data source for this metric yet — type the latest actual ${metricMeta.startLabel} into the field on the right to run the valuation.`}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center py-5 px-2 border-b border-slate-100 dark:border-slate-700">
              <Kpi label="Live Price" value={formatCurrency(livePrice, 2, currency)} />
              <div className="w-px self-stretch bg-slate-100 dark:bg-slate-700" />
              <Kpi big label="Intrinsic Value" value={formatCurrency(intrinsic, 0, currency)}
                sub={`${Math.abs(overUnder).toFixed(0)}% ${over ? 'Overvalued' : 'Undervalued'}`}
                subClass={over ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'} />
              <div className="w-px self-stretch bg-slate-100 dark:bg-slate-700" />
              <Kpi big label={`${HORIZON} Year Value`} value={formatCurrency(futureValue, 0, currency)}
                sub={`${cagr.toFixed(0)}% CAGR`} subClass="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex items-center justify-between px-5 pt-3.5 pb-1">
              <div className="flex gap-5">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 dark:text-white">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: metricMeta.color }} />
                  {metricMeta.label} Per Share
                </span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Dividends
                </span>
              </div>
            </div>
            <div className="h-[300px] px-3 pb-3">
              <ValuationChart series={series} color={metricMeta.color} metricLabel={metricMeta.label} currency={currency} isDark={dark} />
            </div>
          </>
        )}
      </div>

      {/* RIGHT — assumptions */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div className="flex flex-wrap gap-x-4 gap-y-2 pb-1 border-b border-slate-100 dark:border-slate-700">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className="inline-flex items-center gap-1.5"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={m.key === metric ? { background: m.color } : { border: '1.5px solid #94a3b8', background: 'transparent' }}
              />
              <span className={`text-[13px] font-semibold ${m.key === metric ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
        {metricMeta.note && (
          <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-2 mb-4">{metricMeta.note}</p>
        )}

        <div className={metricMeta.note ? 'mb-6' : 'mt-4 mb-6'}>
          <label className="block text-[13px] font-semibold text-slate-900 dark:text-white mb-2">
            Starting {metricMeta.startLabel} ({currency})
          </label>
          <StartValueInput
            value={active.start}
            onCommit={(v) => updateMetric(metric, { start: v })}
          />
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1.5">
            {metric === 'net'
              ? 'Prefilled from the latest annual diluted EPS (SEC EDGAR) — edit freely.'
              : 'Manual entry — no automated data source for this metric yet.'}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <Stepper color={metricMeta.color} label={`${metricMeta.label} YoY Growth Rate`}
            value={active.growth} onChange={(v) => updateMetric(metric, { growth: v })} min={0} max={80} suffix="%"
            hint={`${active.growth}% estimated ${metricMeta.label} growth rate.`} />
          <Stepper color={metricMeta.color} label={`${metricMeta.ratioAbbr} Ratio at Sale`}
            value={active.ratio} onChange={(v) => updateMetric(metric, { ratio: v })} min={1} max={80}
            hint={`${active.ratio} ${metricMeta.ratioAbbr} ratio assumed at the ${HORIZON}-year exit.`} />
          <Stepper color="#64748B" label="Target Rate of Return"
            value={assumptions.targetReturn} onChange={updateTargetReturn} min={1} max={40} suffix="%"
            hint={`Discount future value back at ${assumptions.targetReturn}%/yr to get intrinsic value. Shared across all metrics.`} />
        </div>
      </div>
    </div>
  );
}

// ---------- HISTORICALS TAB ----------
function mergeRevenueIncome(revenue?: FundamentalEntry[], netIncome?: FundamentalEntry[]) {
  const byDate = new Map<string, { date: string; revenue?: number; netIncome?: number }>();
  for (const e of revenue ?? []) byDate.set(e.date, { ...byDate.get(e.date), date: e.date, revenue: e.value });
  for (const e of netIncome ?? []) byDate.set(e.date, { ...byDate.get(e.date), date: e.date, netIncome: e.value });
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const HISTORY_ROWS: { key: string; label: string; unit: 'currency' | 'perShare' }[] = [
  { key: 'revenue', label: 'Revenue', unit: 'currency' },
  { key: 'netIncome', label: 'Net Income', unit: 'currency' },
  { key: 'epsDiluted', label: 'EPS (Diluted)', unit: 'perShare' },
  { key: 'dividendPerShare', label: 'Dividend / Share', unit: 'perShare' },
];

function buildFinancialTable(concepts: Record<string, FundamentalEntry[]>) {
  const perKeyByYear = HISTORY_ROWS.map(({ key }) => {
    const map = new Map<string, number>();
    for (const e of [...(concepts[key] ?? [])]
      .filter((e) => e.form?.startsWith('10-K'))
      .sort((a, b) => a.date.localeCompare(b.date))) {
      map.set(e.date.slice(0, 4), e.value);
    }
    return map;
  });
  const years = new Set<string>();
  perKeyByYear.forEach((m) => m.forEach((_v, y) => years.add(y)));
  const sortedYears = [...years].sort().slice(-4);
  return {
    years: sortedYears,
    rows: HISTORY_ROWS.map(({ label, unit }, i) => ({
      label, unit, values: sortedYears.map((y) => perKeyByYear[i].get(y)),
    })),
  };
}

function HistoricalsTab({ ticker, currency }: { ticker: string; currency: string }) {
  const { data, isLoading } = useFundamentals(ticker);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const concepts = data?.concepts ?? {};
  const hasData = Object.keys(concepts).length > 0;
  const revenueIncome = mergeRevenueIncome(concepts.revenue, concepts.netIncome);
  const { years, rows } = buildFinancialTable(concepts);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Revenue vs Net Income</div>
        <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-3.5">SEC EDGAR filings · {ticker}</div>
        {!hasData ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">
            No fundamentals loaded yet. US-listed stocks only (SEC EDGAR filings).
          </p>
        ) : revenueIncome.length > 1 ? (
          <div className="h-[260px]">
            <StackedAreaChart
              data={revenueIncome}
              xAxisKey="date"
              areas={[{ dataKey: 'revenue', name: 'Revenue' }, { dataKey: 'netIncome', name: 'Net Income' }]}
              yFormatter={(v) => formatCompactCurrency(v, currency)}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">Not enough data points to chart yet.</p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4.5 pt-4 pb-3">
          <div className="text-[14px] font-semibold text-slate-900 dark:text-white">Financial history</div>
          <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Fiscal year · 10-K filings</div>
        </div>
        {years.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12 px-4">
            No annual (10-K) fundamentals loaded yet.
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-t border-slate-100 dark:border-slate-700">
                <th className="text-left px-4.5 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Metric</th>
                {years.map((y) => (
                  <th key={y} className="text-right px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-slate-50 dark:border-slate-800">
                  <td className="px-4.5 py-2 text-[13px] text-slate-700 dark:text-slate-300">{r.label}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-3 py-2 text-right text-[13px] font-medium text-slate-900 dark:text-white tabular-nums">
                      {v == null ? '—' : r.unit === 'perShare' ? formatCurrency(v, 2, currency) : formatCompactCurrency(v, currency)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------- PAGE ----------
export default function StockValuationPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId!;
  const { data: holdings, isLoading, error } = useHoldings(pid);
  const [ticker, setTicker] = useState<string | null>(null);
  const [tab, setTab] = useState<'Valuation' | 'Historicals'>('Valuation');

  // Custom assets have no fundamentals/DCF story (user-set prices, no SEC filer,
  // no cash-flow concept) — only real STOCK holdings are selectable here.
  const stockHoldings = useMemo(
    () => (holdings ?? []).filter((h) => h.assetType === 'STOCK'),
    [holdings],
  );

  // The route keeps this component mounted when only :portfolioId changes, so a
  // ticker chosen in the previous portfolio would silently leak into the new one.
  useEffect(() => {
    setTicker(null);
  }, [pid]);

  useEffect(() => {
    if (!ticker && stockHoldings.length > 0) setTicker(stockHoldings[0].ticker);
  }, [ticker, stockHoldings]);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading holdings" message={(error as Error).message} />;

  if (stockHoldings.length === 0) {
    return (
      <EmptyState
        icon={CalculatorIcon}
        title="No stock holdings to value"
        description="Stock Valuation runs a DCF model against SEC EDGAR fundamentals — it's only available for STOCK holdings, not custom assets or crypto."
      />
    );
  }

  const holding = stockHoldings.find((h) => h.ticker === ticker) ?? stockHoldings[0];
  const currency = holding.currency ?? 'USD';

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-[20px] font-semibold text-slate-900 dark:text-white">Stock Valuation</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Model a fair value for any stock holding with a discounted-cash-flow projection
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <HoldingSelector holdings={stockHoldings} holding={holding} currency={currency} onSelect={setTicker} />
        <div className="flex-1" />
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 gap-0.5">
          {(['Valuation', 'Historicals'] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors ${
                tab === tb
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tb}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Valuation'
        ? <ValuationTab holding={holding} currency={currency} />
        : <HistoricalsTab ticker={holding.ticker} currency={currency} />}
    </div>
  );
}
