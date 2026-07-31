import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart3, ChevronDown, ChevronUp, Coins, Download, Info, LineChart,
  PieChart, RefreshCw, Target, Wallet, Building2, Hash, CalendarDays,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useHoldings } from '../../hooks/useHoldings';
import { useStatistics, useRefreshStatistics } from '../../hooks/useMarketData';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import TickerSelector from '../../components/ui/TickerSelector';
import type { Holding } from '../../types/holding';
import type { MarketStatistics } from '../../types/marketData';

// ---------- FORMATTERS ----------
// Every statistic is optional. null/undefined renders as an em dash — it means
// "the exchange or filing doesn't report this", never zero.
const DASH = '—';

function abbr(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(2) + 'k';
  return v.toFixed(2);
}

/** Currency prefix for the price currency, incl. "GBp" pence listings. */
function curPrefix(currency?: string): string {
  if (!currency) return '';
  if (currency === 'GBp' || currency === 'GBx') return '';
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: 'CHF ' };
  return symbols[currency] ?? `${currency} `;
}
function curSuffix(currency?: string): string {
  return currency === 'GBp' || currency === 'GBx' ? 'p' : '';
}

function makeMoney(currency?: string) {
  const pre = curPrefix(currency);
  const suf = curSuffix(currency);
  return {
    // per-share / price scale
    m: (v?: number | null, d = 2) => (v == null ? null : `${pre}${v.toFixed(d)}${suf}`),
    // filing scale (billions/trillions)
    big: (v?: number | null) => (v == null ? null : `${pre}${abbr(v)}${suf}`),
  };
}

/** Yahoo fraction (0.3934) → "39.34%". */
const frac = (v?: number | null, d = 2) => (v == null ? null : `${(v * 100).toFixed(d)}%`);
/** Yahoo already-percent value (0.93, 30.27) → "0.93%". */
const pct = (v?: number | null, d = 2) => (v == null ? null : `${v.toFixed(d)}%`);
const num = (v?: number | null, d = 2) => (v == null ? null : v.toFixed(d));
const int = (v?: number | null) => (v == null ? null : v.toLocaleString('en-US'));
const shares = (v?: number | null) => (v == null ? null : abbr(v));
const date = (v?: string | null) =>
  v == null ? null : new Date(`${v}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const REC_LABEL: Record<string, string> = {
  strong_buy: 'Strong Buy', buy: 'Buy', hold: 'Hold', underperform: 'Underperform', sell: 'Sell',
};

// ---------- GROUPS ----------
type Row = { label: string; value: string | null; kind?: 'signed' | 'link' } | { sub: string };
interface Group { id: string; title: string; icon: LucideIcon; hint?: string; rows: Row[] }

function isSub(r: Row): r is { sub: string } {
  return 'sub' in r;
}

function buildGroups(s: MarketStatistics): Group[] {
  const { m, big } = makeMoney(s.currency);
  return [
    {
      id: 'valuation', title: 'Valuation measures', icon: Target, rows: [
        { label: 'Market cap', value: big(s.marketCap) },
        { label: 'Enterprise value', value: big(s.enterpriseValue) },
        { label: 'Trailing P/E', value: num(s.trailingPE) },
        { label: 'Forward P/E', value: num(s.forwardPE) },
        { label: 'PEG ratio', value: num(s.pegRatio) },
        { label: 'Price / sales', value: num(s.priceToSales) },
        { label: 'Price / book', value: num(s.priceToBook) },
        { label: 'EV / revenue', value: num(s.enterpriseToRevenue) },
        { label: 'EV / EBITDA', value: num(s.enterpriseToEbitda) },
      ],
    },
    {
      id: 'profit', title: 'Profitability & returns', icon: PieChart, hint: 'ttm', rows: [
        { label: 'Profit margin', value: frac(s.profitMargin) },
        { label: 'Operating margin', value: frac(s.operatingMargin) },
        { label: 'Gross margin', value: frac(s.grossMargin) },
        { label: 'EBITDA margin', value: frac(s.ebitdaMargin) },
        { sub: 'Management effectiveness' },
        { label: 'Return on assets', value: frac(s.returnOnAssets) },
        { label: 'Return on equity', value: frac(s.returnOnEquity) },
      ],
    },
    {
      id: 'profile', title: 'Fiscal calendar & profile', icon: Building2, rows: [
        { label: 'Fiscal year ends', value: date(s.fiscalYearEnd) },
        { label: 'Most recent quarter', value: date(s.mostRecentQuarter) },
        { label: 'Exchange', value: s.exchange ?? null },
        { label: 'Quote type', value: s.quoteType ? s.quoteType[0] + s.quoteType.slice(1).toLowerCase() : null },
        { label: 'Full-time employees', value: int(s.fullTimeEmployees) },
        { label: 'Website', value: s.website ?? null, kind: 'link' },
      ],
    },
    {
      id: 'income', title: 'Income statement', icon: Coins, hint: 'ttm', rows: [
        { label: 'Revenue', value: big(s.revenue) },
        { label: 'Revenue per share', value: m(s.revenuePerShare) },
        { label: 'Quarterly revenue growth (yoy)', value: frac(s.revenueGrowth) },
        { label: 'Gross profit', value: big(s.grossProfit) },
        { label: 'EBITDA', value: big(s.ebitda) },
        { label: 'Net income to common', value: big(s.netIncomeToCommon) },
        { label: 'Diluted EPS', value: m(s.dilutedEps) },
        { label: 'Forward EPS', value: m(s.forwardEps) },
        { label: 'Quarterly earnings growth (yoy)', value: frac(s.earningsQuarterlyGrowth) },
        { label: 'Earnings growth', value: frac(s.earningsGrowth) },
      ],
    },
    {
      id: 'balance', title: 'Balance sheet', icon: Wallet, hint: 'mrq', rows: [
        { label: 'Total cash', value: big(s.totalCash) },
        { label: 'Total cash per share', value: m(s.totalCashPerShare) },
        { label: 'Total debt', value: big(s.totalDebt) },
        { label: 'Total debt / equity', value: pct(s.debtToEquity) },
        { label: 'Current ratio', value: num(s.currentRatio) },
        { label: 'Quick ratio', value: num(s.quickRatio) },
        { label: 'Book value per share', value: m(s.bookValuePerShare) },
        { sub: 'Cash flow · ttm' },
        { label: 'Operating cash flow', value: big(s.operatingCashflow) },
        { label: 'Levered free cash flow', value: big(s.freeCashflow) },
      ],
    },
    {
      id: 'dividends', title: 'Dividends & splits', icon: CalendarDays, rows: [
        { label: 'Forward dividend rate', value: m(s.dividendRate) },
        { label: 'Forward dividend yield', value: pct(s.dividendYield) },
        { label: 'Trailing annual rate', value: m(s.trailingAnnualDividendRate) },
        { label: 'Trailing annual yield', value: frac(s.trailingAnnualDividendYield) },
        { label: '5-year average yield', value: pct(s.fiveYearAvgDividendYield) },
        { label: 'Payout ratio', value: frac(s.payoutRatio) },
        { label: 'Ex-dividend date', value: date(s.exDividendDate) },
        { label: 'Next dividend date', value: date(s.nextDividendDate) },
        { label: 'Last split factor', value: s.lastSplitFactor ?? null },
        { label: 'Last split date', value: date(s.lastSplitDate) },
      ],
    },
    {
      id: 'trading', title: 'Trading & 52-week', icon: LineChart, rows: [
        { label: 'Beta (5y monthly)', value: num(s.beta) },
        { label: '52-week high', value: m(s.fiftyTwoWeekHigh) },
        { label: '52-week low', value: m(s.fiftyTwoWeekLow) },
        { label: '52-week change', value: frac(s.fiftyTwoWeekChange), kind: 'signed' },
        { label: 'S&P 500 52-week change', value: frac(s.sp500FiftyTwoWeekChange), kind: 'signed' },
        { label: '50-day average', value: m(s.fiftyDayAverage) },
        { label: '200-day average', value: m(s.twoHundredDayAverage) },
        { label: 'Volume', value: int(s.volume) },
        { label: 'Average volume (3m)', value: int(s.averageVolume) },
        { label: 'Average volume (10d)', value: int(s.averageVolume10days) },
      ],
    },
    {
      id: 'shares', title: 'Share statistics', icon: Hash, rows: [
        { label: 'Shares outstanding', value: shares(s.sharesOutstanding) },
        { label: 'Implied shares outstanding', value: shares(s.impliedSharesOutstanding) },
        { label: 'Float', value: shares(s.floatShares) },
        { label: 'Shares short', value: int(s.sharesShort) },
        { label: 'Shares short (prior month)', value: int(s.sharesShortPriorMonth) },
        { label: 'Short ratio', value: num(s.shortRatio) },
        { label: 'Short % of float', value: frac(s.shortPercentOfFloat) },
        { label: '% held by insiders', value: frac(s.heldPercentInsiders) },
        { label: '% held by institutions', value: frac(s.heldPercentInstitutions) },
      ],
    },
  ];
}

// ---------- ROW ----------
function StatRow({ label, value, kind, last }: { label: string; value: string | null; kind?: 'signed' | 'link'; last: boolean }) {
  const missing = value == null;
  const signedColor =
    kind === 'signed' && !missing
      ? parseFloat(value) >= 0
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-500 dark:text-red-400'
      : '';
  return (
    <div
      className={`flex items-baseline justify-between gap-3.5 py-[7px] ${
        last ? '' : 'border-b border-slate-100 dark:border-slate-700/60'
      }`}
    >
      <span className="text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={`text-[13px] whitespace-nowrap tabular-nums ${
          missing
            ? 'font-normal text-slate-400 dark:text-slate-500'
            : kind === 'link'
              ? 'font-semibold text-indigo-600 dark:text-indigo-400'
              : `font-semibold ${signedColor || 'text-slate-900 dark:text-white'}`
        }`}
      >
        {missing ? DASH : value}
      </span>
    </div>
  );
}

// ---------- GROUP CARD ----------
function StatGroup({ group, hideMissing }: { group: Group; hideMissing: boolean }) {
  const [open, setOpen] = useState(true);
  const cells = group.rows.filter((r): r is Extract<Row, { label: string }> => !isSub(r));
  const reported = cells.filter((r) => r.value != null).length;
  const rows = hideMissing ? group.rows.filter((r) => isSub(r) || r.value != null) : group.rows;
  const visible = rows.filter((r) => !isSub(r));
  const Icon = group.icon;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-4 py-3 bg-slate-50 dark:bg-slate-900/40 ${
          open ? 'border-b border-slate-200 dark:border-slate-700' : ''
        }`}
      >
        <Icon className="h-3.5 w-3.5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
        <span className="text-[12.5px] font-semibold text-slate-900 dark:text-white">{group.title}</span>
        {group.hint && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{group.hint}</span>
        )}
        <span className="flex-1" />
        <span className="text-[10.5px] tabular-nums text-slate-400 dark:text-slate-500">
          {reported}/{cells.length}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="px-4 pt-1 pb-2.5">
          {visible.length === 0 ? (
            <div className="py-2.5 text-[12px] italic text-slate-400 dark:text-slate-500">Nothing reported in this group</div>
          ) : (
            rows.map((r, i) =>
              isSub(r) ? (
                <div
                  key={`sub-${r.sub}`}
                  className="pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                >
                  {r.sub}
                </div>
              ) : (
                <StatRow key={r.label} label={r.label} value={r.value} kind={r.kind} last={i === rows.length - 1} />
              ),
            )
          )}
        </div>
      )}
    </div>
  );
}

// ---------- KPI STRIP ----------
function KpiTile({ label, value, sub, subClass, first }: {
  label: string; value: string | null; sub?: string | null; subClass?: string; first?: boolean;
}) {
  return (
    <div className={`flex-1 min-w-[140px] px-4 ${first ? '' : 'border-l border-slate-200 dark:border-slate-700'}`}>
      <div className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">{label}</div>
      <div className={`text-[22px] font-bold tabular-nums tracking-tight leading-none ${value == null ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
        {value ?? DASH}
      </div>
      {sub && <div className={`text-[11.5px] mt-1.5 ${subClass ?? 'text-slate-500 dark:text-slate-400'}`}>{sub}</div>}
    </div>
  );
}

// ---------- ANALYST TARGET RANGE ----------
function TargetRange({ s, price }: { s: MarketStatistics; price: number | null }) {
  const { m } = makeMoney(s.currency);
  const low = s.targetLowPrice;
  const high = s.targetHighPrice;
  const mean = s.targetMeanPrice;
  if (low == null || high == null || high <= low) {
    return <div className="py-2 text-[12px] text-slate-400 dark:text-slate-500">No analyst coverage for this listing</div>;
  }
  const at = (v: number) => `${Math.max(0, Math.min(100, ((v - low) / (high - low)) * 100))}%`;
  const upside = mean != null && price != null && price > 0 ? (mean / price - 1) * 100 : null;

  return (
    <div>
      <div className="relative h-[34px] mt-1.5">
        <div className="absolute inset-x-0 top-[13px] h-2 rounded-full border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-red-500/20 via-amber-500/20 to-green-500/30" />
        {mean != null && (
          <div className="absolute top-1.5 w-[3px] h-[22px] rounded-sm bg-indigo-600 dark:bg-indigo-400" style={{ left: at(mean), transform: 'translateX(-50%)' }} />
        )}
        {price != null && (
          <div
            className="absolute top-[9px] w-3 h-3 rounded-full bg-white dark:bg-slate-800 border-[3px] border-slate-900 dark:border-white"
            style={{ left: at(price), transform: 'translateX(-50%)' }}
            title="Last price"
          />
        )}
      </div>
      <div className="flex justify-between text-[11.5px] tabular-nums">
        <span className="text-slate-500 dark:text-slate-400">{m(low)} <span className="text-slate-400 dark:text-slate-500">low</span></span>
        <span className="font-bold text-indigo-600 dark:text-indigo-400">{m(mean)} mean</span>
        <span className="text-slate-500 dark:text-slate-400"><span className="text-slate-400 dark:text-slate-500">high</span> {m(high)}</span>
      </div>
      {upside != null && (
        <div className="mt-2.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          Consensus implies{' '}
          <span className={`font-bold tabular-nums ${upside >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {upside >= 0 ? '+' : ''}{upside.toFixed(2)}%
          </span>{' '}
          from the last price <span className="text-slate-400 dark:text-slate-500">({m(price)})</span>.
        </div>
      )}
    </div>
  );
}

// ---------- SKELETON ----------
function StatsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 space-y-3">
            <div className="h-2.5 w-3/5 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-4/5 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <div className="h-2.5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="p-4 space-y-3.5">
              {Array.from({ length: 6 + (i % 3) }).map((__, j) => (
                <div key={j} className="flex justify-between gap-6">
                  <div className="h-2.5 rounded bg-slate-200 dark:bg-slate-700" style={{ width: `${44 + ((j * 7) % 26)}%` }} />
                  <div className="h-2.5 w-14 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- PAGE ----------
export default function StatisticsPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId!;
  const { data: holdings, isLoading, error } = useHoldings(pid);
  const [ticker, setTicker] = useState<string | null>(null);
  const [view, setView] = useState<'All fields' | 'Reported'>('All fields');

  // Yahoo key statistics only exist for exchange-listed instruments — custom
  // assets carry user-set prices and have no provider snapshot at all.
  const selectable = useMemo(
    () => (holdings ?? []).filter((h) => h.assetType === 'STOCK' || h.assetType === 'CRYPTO'),
    [holdings],
  );

  // The route element survives a :portfolioId change, so drop a ticker chosen in
  // the previous portfolio instead of letting it leak into the new one.
  useEffect(() => { setTicker(null); }, [pid]);
  useEffect(() => {
    if (!ticker && selectable.length > 0) setTicker(selectable[0].ticker);
  }, [ticker, selectable]);

  const active: Holding | undefined = selectable.find((h) => h.ticker === ticker) ?? selectable[0];
  const { data: stats, isLoading: statsLoading, error: statsError } = useStatistics(active?.ticker ?? null);
  const refresh = useRefreshStatistics(active?.ticker ?? '');

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading holdings" message={(error as Error).message} />;

  if (!active) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No tickers to analyse"
        description="Statistics reads a Yahoo Finance snapshot per ticker — add a stock or crypto holding to this portfolio first."
      />
    );
  }

  const groups = stats ? buildGroups(stats) : [];
  const allCells = groups.flatMap((g) => g.rows.filter((r) => !isSub(r)) as Extract<Row, { label: string }>[]);
  const reported = allCells.filter((r) => r.value != null).length;
  const sparse = allCells.length > 0 && reported / allCells.length < 0.5;
  const hideMissing = view === 'Reported';
  const byId = (ids: string[]) => ids.map((id) => groups.find((g) => g.id === id)).filter((g): g is Group => Boolean(g));
  const money = makeMoney(stats?.currency);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900 dark:text-white">Statistics</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            Key statistics for {active.ticker} · sourced from Yahoo Finance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats?.updatedAt && (
            <span className="inline-flex items-center gap-2 text-[11.5px] tabular-nums text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              as of {stats.updatedAt}
            </span>
          )}
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? 'animate-spin' : ''}`} />
            {refresh.isPending ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <TickerSelector holdings={selectable} selected={active} onSelect={setTicker} />
        {stats && (
          <>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{reported}</span> of {allCells.length} fields reported
              {sparse && <span className="text-slate-400 dark:text-slate-500"> · thin coverage is normal outside the US</span>}
            </div>
            <div className="flex-1" />
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 gap-0.5">
              {(['All fields', 'Reported'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors ${
                    view === v
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {statsLoading ? (
        <StatsSkeleton />
      ) : statsError ? (
        <ErrorAlert
          title="Couldn't load statistics"
          message={`${(statsError as Error).message}. Nothing stored was overwritten — try refreshing again.`}
        />
      ) : !stats ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm px-6 py-14">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <BarChart3 className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
            </div>
            <div className="text-[17px] font-semibold text-slate-900 dark:text-white mb-1.5">No statistics yet</div>
            <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 mb-5">
              Nothing has been fetched for <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{active.ticker}</span> yet.
              Pull the current key statistics from Yahoo Finance — you can refresh any time.
            </p>
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Download className={`h-4 w-4 ${refresh.isPending ? 'animate-pulse' : ''}`} />
              {refresh.isPending ? 'Loading…' : 'Load from Yahoo'}
            </button>
            <div className="mt-3.5 text-[11.5px] tabular-nums text-slate-400 dark:text-slate-500">
              Field coverage varies by exchange
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* headline KPIs */}
          <div className="flex flex-wrap gap-y-5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm py-4 px-1">
            <KpiTile first label="Market cap" value={money.big(stats.marketCap)}
              sub={stats.enterpriseValue == null ? 'EV not reported' : `EV ${money.big(stats.enterpriseValue)}`} />
            <KpiTile label="Trailing P/E" value={num(stats.trailingPE)}
              sub={stats.forwardPE == null ? null : `fwd ${num(stats.forwardPE)}`} />
            <KpiTile label="Profit margin" value={frac(stats.profitMargin)}
              sub={stats.operatingMargin == null ? null : `op ${frac(stats.operatingMargin)}`} />
            <KpiTile label="Return on equity" value={frac(stats.returnOnEquity)}
              sub={stats.returnOnAssets == null ? null : `ROA ${frac(stats.returnOnAssets)}`} />
            <KpiTile label="Dividend yield" value={pct(stats.dividendYield)}
              sub={stats.payoutRatio == null ? null : `payout ${frac(stats.payoutRatio, 1)}`} />
            <KpiTile label="Beta (5y)" value={num(stats.beta)}
              sub={stats.fiftyTwoWeekChange == null ? null : `52w ${(stats.fiftyTwoWeekChange * 100).toFixed(2)}%`}
              subClass={
                stats.fiftyTwoWeekChange == null
                  ? undefined
                  : stats.fiftyTwoWeekChange >= 0
                    ? 'font-semibold text-green-600 dark:text-green-400'
                    : 'font-semibold text-red-500 dark:text-red-400'
              } />
          </div>

          {/* three balanced columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="space-y-4">
              {byId(['valuation', 'profit', 'profile']).map((g) => (
                <StatGroup key={g.id} group={g} hideMissing={hideMissing} />
              ))}
            </div>
            <div className="space-y-4">
              {byId(['income', 'balance', 'dividends']).map((g) => (
                <StatGroup key={g.id} group={g} hideMissing={hideMissing} />
              ))}
            </div>
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                  <Target className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[12.5px] font-semibold text-slate-900 dark:text-white">Analyst price targets</span>
                  <span className="flex-1" />
                  {stats.recommendationKey && (
                    <span className="rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-500/15">
                      {REC_LABEL[stats.recommendationKey] ?? stats.recommendationKey}
                    </span>
                  )}
                </div>
                <div className="px-4 pt-3.5 pb-4">
                  <TargetRange s={stats} price={active.currentShareValue ?? null} />
                  {stats.numberOfAnalystOpinions != null && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-x-5">
                      <StatRow label="Analysts covering" value={int(stats.numberOfAnalystOpinions)} last />
                      <StatRow label="Mean rating" value={num(stats.recommendationMean, 1)} last />
                    </div>
                  )}
                </div>
              </div>
              {byId(['trading', 'shares']).map((g) => (
                <StatGroup key={g.id} group={g} hideMissing={hideMissing} />
              ))}
            </div>
          </div>

          {/* footnote — explains the em dash once so it never reads as broken */}
          <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              <span className="tabular-nums">{DASH}</span> means the exchange or filing doesn't report that figure. It is never a zero.
              Ratios follow Yahoo's own scaling: margins, growth and returns are fractions; dividend yield, 5-year average yield and
              debt/equity arrive as percentages.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
