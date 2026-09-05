import { Fragment, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Check, ChevronDown, ChevronRight, Coins, Download, Info, Plus, Sprout, Target, Wallet,
} from 'lucide-react';
import { useHoldings, useCreateTransaction } from '../../hooks/useHoldings';
import { useDividendCalendar } from '../../hooks/useDividendCalendar';
import { useAllTags } from '../../hooks/useTags';
import { usePortfolioCurrency } from '../../hooks/usePortfolioCurrency';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import StockLogo from '../../components/ui/StockLogo';
import CreateTransactionDialog from '../holdings/CreateTransactionDialog';
import { Chip, Segmented, TD, TH } from '../watchlist/rowBits';
import { formatCurrency } from '../../lib/formatters';
import {
  ALL_TAGS, PERIOD_DIVISOR, PERIODS, SORTS, TIER_COLOR,
  buildRows, cadenceLabel, calcSelfFunding, paymentsPerYearByTicker,
  type Period, type SfCalc, type SfRow, type Sort, type Tier,
} from './selfFundingMath';
import type { Currency } from '../../types/transaction';

// currencies the transaction form accepts — a holding quoted in anything else
// (GBp…) is recorded with the form's default rather than a value it can't show
const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CHF', 'PLN', 'CZK'];

/** Money in the row's own quote currency — the API never converts. */
const rowMoney = (value: number | null | undefined, row: SfRow, decimals?: number) =>
  (value == null ? '—' : formatCurrency(value, decimals, row.currency ?? 'USD'));

const shares = (n: number | null | undefined) =>
  (n == null || !Number.isFinite(n) ? '—' : Math.round(n).toLocaleString('en-US'));

const PERIOD_NOUN: Record<Period, string> = { Yearly: 'year', Quarterly: 'quarter', Monthly: 'month' };

/** Shares one period's dividend buys, e.g. "5.20 sh". */
const buysShares = (calc: SfCalc) =>
  `${calc.sharesPerPeriod.toFixed(calc.sharesPerPeriod < 10 ? 2 : 1)} sh`;

/**
 * 100% = the dividend buys exactly one share; 520% = it buys 5.2. Uncapped above
 * the threshold — that multiple is the whole point once a position clears it. A row
 * still short of a whole share is held at 99% so it can never read as reached.
 */
function coverageLabel(calc: SfCalc): string {
  const pct = calc.sharesPerPeriod * 100;
  if (calc.gapShares > 0) return `${Math.min(99, Math.round(pct))}%`;
  return `${Math.round(pct).toLocaleString('en-US')}%`;
}

/**
 * Progress toward this row's own threshold: the track is 0…sharesNeeded, so a full
 * bar means reached and the label carries how far past. A shared absolute scale
 * would squash every position that needs hundreds of shares into a sliver.
 */
function SfProgress({ calc, color, period }: { calc: SfCalc; color: string; period: Period }) {
  const done = calc.gapShares === 0;
  const pct = Math.max(2, calc.progress * 100);
  return (
    <div
      className="flex items-center gap-2"
      title={`One ${PERIOD_NOUN[period]} of dividends buys ${buysShares(calc)} at today's price`}
    >
      <div className="relative flex-1 h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${pct}%`, background: done ? color : `linear-gradient(90deg, ${color}66, ${color})` }}
        />
        {/* hatched end cap: every overshoot looks alike, the numbers carry how far over */}
        {done && (
          <div
            className="absolute inset-y-0 right-0 w-[26%]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, transparent 0 3px, rgba(255,255,255,0.7) 3px 5px)',
            }}
          />
        )}
      </div>
      <span
        className={`w-[44px] text-right text-[10.5px] font-bold tabular-nums ${done ? '' : 'text-slate-400 dark:text-slate-500'}`}
        style={done ? { color } : undefined}
      >
        {coverageLabel(calc)}
      </span>
    </div>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  const color = TIER_COLOR[tier];
  return (
    <span
      className="inline-block rounded px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ color, background: `${color}1F` }}
    >
      {tier}
    </span>
  );
}

/** Expanded row: all three periods side by side + the reinvest-only projection. */
function RowDetail({ row, period, onBuy }: { row: SfRow; period: Period; onBuy: () => void }) {
  const sel = calcSelfFunding(row, period);
  const yearsText = sel.years == null ? 'needs a first share'
    : sel.years > 200 ? '200+ years'
      : `~${sel.years < 10 ? sel.years.toFixed(1) : Math.round(sel.years)} years`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 px-5 py-5 bg-slate-50 dark:bg-slate-900/40">
      <div>
        <div className="text-[12.5px] font-semibold text-slate-900 dark:text-white mb-2.5">
          {row.ticker} · one share of self-funding, by period
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PERIODS.map((p) => {
            const calc = calcSelfFunding(row, p);
            const active = p === period;
            const color = TIER_COLOR[calc.tier];
            return (
              <div
                key={p}
                className={`rounded-lg bg-white dark:bg-slate-800 px-3.5 py-3 border ${
                  active
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${
                    active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                  >
                    {p}
                  </span>
                  <TierBadge tier={calc.tier} />
                </div>
                {([
                  ['Shares needed', shares(calc.needed), 'text-slate-900 dark:text-white'],
                  ['Shares held', shares(row.held), 'text-slate-500 dark:text-slate-400'],
                  ['Dividend buys', `${buysShares(calc)} · ${coverageLabel(calc)}`, ''],
                  [calc.gapShares === 0 ? 'Shares to spare' : 'Shares to go',
                    calc.gapShares === 0 ? shares(row.held - calc.needed) : shares(calc.gapShares), ''],
                  ['Cost to close', calc.gapShares === 0 ? '—' : rowMoney(calc.gapCost, row, 0), 'text-slate-500 dark:text-slate-400'],
                ] as const).map(([label, value, cls]) => (
                  <div key={label} className="flex items-baseline justify-between py-0.5">
                    <span className="text-[11.5px] text-slate-500 dark:text-slate-400">{label}</span>
                    <span
                      className={`text-[12.5px] font-bold tabular-nums ${cls || 'text-slate-900 dark:text-white'}`}
                      style={calc.gapShares === 0 && label !== 'Shares held' && label !== 'Shares needed' ? { color } : undefined}
                    >
                      {value}
                    </span>
                  </div>
                ))}
                <div className="mt-2"><SfProgress calc={calc} color={color} period={p} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[12.5px] font-semibold text-slate-900 dark:text-white mb-2.5">Reinvest-only projection</div>
        <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3.5">
          <div
            className="text-[30px] font-bold tabular-nums tracking-tight leading-none text-slate-900 dark:text-white"
            style={sel.gapShares === 0 ? { color: TIER_COLOR['Self-funding'] } : undefined}
          >
            {sel.gapShares === 0 ? 'Reached' : yearsText}
          </div>
          <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {sel.gapShares === 0
              ? `${row.ticker} pays for ${buysShares(sel)} every ${PERIOD_NOUN[period]} — ${coverageLabel(sel)} of one share, so every payment from here compounds the position instead of closing a gap.`
              : sel.years == null
                ? `Nothing is held yet, so nothing compounds — the first ${shares(sel.needed)} shares have to be bought.`
                : `Position grows at the ${(sel.yield * 100).toFixed(2)}% yield with every dividend reinvested, no new deposits, price and dividend flat — ${shares(row.held)} → ${shares(sel.needed)} sh.`}
          </div>
          <div className="h-px bg-slate-100 dark:bg-slate-700 my-3" />
          <div className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Yearly threshold is just{' '}
            <b className="text-slate-900 dark:text-white tabular-nums">
              ⌈1 / {(sel.yield * 100).toFixed(2)}%⌉ = {shares(calcSelfFunding(row, 'Yearly').needed)} sh
            </b>
            . Pays {cadenceLabel(row.paymentsPerYear).toLowerCase()}
            {sel.perPayment != null ? ` · ${rowMoney(sel.perPayment, row)} per payment` : ''}.
          </div>
          {sel.gapShares > 0 && (
            <button
              type="button"
              onClick={onBuy}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Buy {shares(sel.gapShares)} more · {rowMoney(sel.gapCost, row, 0)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Self-Funding — how many shares each holding needs before one period's dividend
 * buys one more share at today's price, and what closing that gap costs.
 *
 * Rows stay in their own quote currency; only the KPI strip converts, to the
 * portfolio's base currency. Chips reuse tags rather than a separate grouping.
 */
export default function SelfFundingPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId ?? '';

  const { data: holdings, isLoading, error } = useHoldings(pid);
  const { data: calendar } = useDividendCalendar(pid);
  const { data: allTags = [] } = useAllTags(pid);
  const { mutateAsync: createTransaction, isPending: recording } = useCreateTransaction(pid);

  const [period, setPeriod] = useState<Period>('Quarterly');
  const [activeTag, setActiveTag] = useState<string>(ALL_TAGS);
  const [sort, setSort] = useState<Sort>('Closest first');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [buyTicker, setBuyTicker] = useState<string | null>(null);

  const tagsByTicker = useMemo(() => {
    const map = new Map<string, string[]>();
    allTags.forEach((doc) => map.set(doc.ticker, doc.tags ?? []));
    return map;
  }, [allTags]);

  const { rows, excluded } = useMemo(
    () => buildRows(holdings, paymentsPerYearByTicker(calendar), tagsByTicker),
    [holdings, calendar, tagsByTicker],
  );

  const heldCurrencies = useMemo(() => rows.map((r) => r.currency ?? 'USD'), [rows]);
  const { toBase, money, baseCurrency } = usePortfolioCurrency(pid, heldCurrencies);

  // only tags that sit on a screenable payer — the rest belong to other holdings
  const { tagNames, tagCounts } = useMemo(() => {
    const counts: Record<string, number> = { [ALL_TAGS]: rows.length };
    rows.forEach((row) => row.tags.forEach((tag) => { counts[tag] = (counts[tag] ?? 0) + 1; }));
    return { tagNames: Object.keys(counts).filter((t) => t !== ALL_TAGS).sort(), tagCounts: counts };
  }, [rows]);

  const scored = useMemo(() => {
    const scope = activeTag === ALL_TAGS ? rows : rows.filter((r) => r.tags.includes(activeTag));
    const list = scope.map((row) => ({ row, calc: calcSelfFunding(row, period) }));
    list.sort((a, b) => (
      sort === 'Ticker' ? a.row.ticker.localeCompare(b.row.ticker)
        : sort === 'Cost to close' ? b.calc.gapCost - a.calc.gapCost
          : (b.calc.progress - a.calc.progress) || (a.calc.gapShares - b.calc.gapShares)
    ));
    return list;
  }, [rows, activeTag, period, sort]);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading self-funding data" message={(error as Error).message} />;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Sprout}
        title="No dividend payers in this portfolio"
        description="Self-funding needs a per-share dividend to divide the price by. Every holding here is a non-payer, crypto or a custom asset, so there is no threshold to compute."
      />
    );
  }

  const won = scored.filter((s) => s.calc.gapShares === 0);
  const openGaps = scored.filter((s) => s.calc.gapShares > 0);
  const sharesToGo = scored.reduce((sum, s) => sum + s.calc.gapShares, 0);
  const capitalToClose = scored.reduce((sum, s) => sum + toBase(s.calc.gapCost, s.row.currency), 0);
  const closest = [...openGaps].sort((a, b) => b.calc.progress - a.calc.progress)[0];
  // richest coverage overall — for a self-funder that is the multiple, not 100%
  const best = [...won].sort((a, b) => b.calc.sharesPerPeriod - a.calc.sharesPerPeriod)[0];

  const buyRow = buyTicker ? scored.find((s) => s.row.ticker === buyTicker) ?? null : null;

  const exportCsv = () => {
    const header = ['Ticker', 'Name', 'Currency', 'Price', 'AnnualDPS', 'Cadence', 'PerPayment',
      'SharesNeeded', 'SharesHeld', 'SharesBoughtPerPeriod', 'CoveragePct', 'SharesToGo',
      'CostToClose', 'Status'];
    const csvRows = scored.map(({ row, calc }) => [
      row.ticker, (row.name ?? '').replace(/[",]/g, ' '), row.currency ?? '',
      row.price, row.dps, cadenceLabel(row.paymentsPerYear),
      calc.perPayment != null ? calc.perPayment.toFixed(4) : '',
      calc.needed, row.held, calc.sharesPerPeriod.toFixed(3),
      (calc.sharesPerPeriod * 100).toFixed(1),
      calc.gapShares, calc.gapCost.toFixed(2), calc.tier,
    ]);
    const csv = [header, ...csvRows].map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `self-funding-${period.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900 dark:text-white">Self-Funding</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            How many shares each holding needs before one period&apos;s dividend buys one more share at today&apos;s price
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Period</span>
        <Segmented options={PERIODS} active={period} onChange={setPeriod} />
        <div className="flex flex-wrap items-center gap-2">
          <Chip label={ALL_TAGS} count={tagCounts[ALL_TAGS]} active={activeTag === ALL_TAGS} onClick={() => setActiveTag(ALL_TAGS)} />
          {tagNames.map((tag) => (
            <Chip key={tag} label={`#${tag}`} count={tagCounts[tag]} active={activeTag === tag} onClick={() => setActiveTag(tag)} />
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Sort</span>
        <Segmented options={SORTS} active={sort} onChange={setSort} />
      </div>

      {/* KPIs — the only place that converts to the base currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Check}
          label={`Self-funding · ${period.toLowerCase()}`}
          value={scored.length ? `${won.length} of ${scored.length}` : '—'}
          sub={best
            ? `best ${best.row.ticker} · ${coverageLabel(best.calc)} of one share`
            : 'no position clears the threshold yet'}
          accent={TIER_COLOR['Self-funding']}
        />
        <StatCard
          icon={Coins}
          label="Total shares to go"
          value={scored.length ? shares(sharesToGo) : '—'}
          sub={`across ${openGaps.length} ${openGaps.length === 1 ? 'position' : 'positions'}`}
          accent="#4F46E5"
        />
        <StatCard
          icon={Wallet}
          label="Capital to close every gap"
          value={scored.length ? money(capitalToClose, baseCurrency, 0) : '—'}
          sub={`portfolio base currency · ${baseCurrency}`}
          accent={TIER_COLOR['Very far']}
        />
        <StatCard
          icon={Target}
          label="Closest to threshold"
          value={closest ? closest.row.ticker : won.length ? won[0].row.ticker : '—'}
          sub={closest
            ? `${coverageLabel(closest.calc)} of one share · ${shares(closest.calc.gapShares)} sh to go`
            : won.length ? 'every position is self-funding' : 'nothing screened'}
          accent={TIER_COLOR.Close}
        />
      </div>

      {/* table card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
            {period === 'Yearly' ? 'One share per year' : period === 'Quarterly' ? 'One share every quarter' : 'One share every month'}
          </span>
          <span className="text-[12px] text-slate-500 dark:text-slate-400 tabular-nums">
            threshold = ⌈price ÷ (annual DPS ÷ {PERIOD_DIVISOR[period]})⌉ · rows in their own quote currency
          </span>
          <div className="flex-1" />
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <Info className="h-3.5 w-3.5" /> 100% = the dividend buys one share · 500% = five
          </span>
        </div>

        {scored.length === 0 ? (
          <div className="px-4 pb-6">
            <EmptyState
              icon={Sprout}
              title={`No dividend payers tagged #${activeTag}`}
              description="Nothing tagged this way pays a dividend. Clear the filter to see the rest of the portfolio."
            />
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setActiveTag(ALL_TAGS)}
                className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Clear filter
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${TH} w-[30px]`} />
                  <th className={`${TH} text-left`}>Ticker</th>
                  <th className={`${TH} text-right`}>Price</th>
                  <th className={`${TH} text-right`}>DPS / yr</th>
                  <th className={`${TH} text-left`}>Cadence</th>
                  <th className={`${TH} text-right`}>Shares needed</th>
                  <th className={`${TH} text-right`}>Held</th>
                  <th className={`${TH} text-left w-[190px] min-w-[160px]`}>Dividend coverage</th>
                  <th className={`${TH} text-right`}>To go / buys</th>
                  <th className={`${TH} text-right`}>Cost to close</th>
                  <th className={`${TH} text-left`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {scored.map(({ row, calc }) => {
                  const color = TIER_COLOR[calc.tier];
                  const done = calc.gapShares === 0;
                  const isOpen = expanded === row.ticker;
                  return (
                    <Fragment key={row.ticker}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : row.ticker)}
                        className={`border-t border-slate-100 dark:border-slate-700 cursor-pointer transition-colors ${
                          done
                            ? 'bg-green-50/60 dark:bg-green-500/10 hover:bg-green-50 dark:hover:bg-green-500/15'
                            : isOpen
                              ? 'bg-slate-50 dark:bg-slate-700/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        <td className={`${TD} text-center text-slate-400 dark:text-slate-500`}>
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </td>
                        <td className={TD}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <StockLogo ticker={row.ticker} name={row.name} assetType={row.assetType} size="sm" />
                            <div className="min-w-0">
                              <div className="text-[13px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{row.ticker}</div>
                              <div className="truncate max-w-[168px] text-[11px] text-slate-500 dark:text-slate-400">{row.name ?? '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`${TD} text-right tabular-nums text-slate-900 dark:text-white`}>{rowMoney(row.price, row)}</td>
                        <td className={`${TD} text-right tabular-nums text-slate-500 dark:text-slate-400`}>{rowMoney(row.dps, row)}</td>
                        <td className={TD}>
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <span className="rounded px-1.5 py-px text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700">
                              {cadenceLabel(row.paymentsPerYear)}
                            </span>
                            <span className="text-[11.5px] tabular-nums text-slate-500 dark:text-slate-400">
                              {calc.perPayment != null ? `${rowMoney(calc.perPayment, row)} / pmt` : '—'}
                            </span>
                          </span>
                        </td>
                        <td className={`${TD} text-right text-[13.5px] font-bold tabular-nums text-slate-900 dark:text-white`}>{shares(calc.needed)}</td>
                        <td className={`${TD} text-right tabular-nums text-slate-500 dark:text-slate-400`}>{shares(row.held)}</td>
                        <td className={TD}><SfProgress calc={calc} color={color} period={period} /></td>
                        <td
                          className={`${TD} text-right font-semibold tabular-nums text-slate-900 dark:text-white`}
                          style={done ? { color } : undefined}
                        >
                          {done ? buysShares(calc) : shares(calc.gapShares)}
                        </td>
                        <td className={`${TD} text-right tabular-nums ${done ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                          {done ? '—' : rowMoney(calc.gapCost, row, 0)}
                        </td>
                        <td className={TD}><TierBadge tier={calc.tier} /></td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-slate-100 dark:border-slate-700">
                          <td colSpan={11} className="p-0">
                            <RowDetail row={row} period={period} onBuy={() => setBuyTicker(row.ticker)} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* legend */}
        <div className="flex flex-wrap gap-3.5 items-center px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400">
          {(Object.keys(TIER_COLOR) as Tier[]).map((tier) => (
            <span key={tier} className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLOR[tier] }} /> {tier}
            </span>
          ))}
          <span className="ml-auto tabular-nums">
            {excluded > 0
              ? `${excluded} holding${excluded === 1 ? '' : 's'} excluded — no per-share dividend, crypto or custom assets`
              : 'every holding pays a dividend'}
          </span>
        </div>
      </div>

      {/* close the gap for real: prefilled BUY for the whole remaining shortfall */}
      {buyRow && (
        <CreateTransactionDialog
          open
          onClose={() => setBuyTicker(null)}
          isPending={recording}
          portfolioId={pid}
          initial={{
            assetType: buyRow.row.assetType ?? 'STOCK',
            transactionType: 'BUY',
            ticker: buyRow.row.ticker,
            quantity: String(buyRow.calc.gapShares),
            price: String(buyRow.row.price),
            ...(SUPPORTED_CURRENCIES.includes(buyRow.row.currency as Currency)
              ? { currency: buyRow.row.currency as Currency }
              : {}),
          }}
          onSubmit={async (payload) => {
            await createTransaction(payload);
            setBuyTicker(null);
          }}
        />
      )}
    </div>
  );
}
