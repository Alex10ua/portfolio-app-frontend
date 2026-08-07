import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Target, PieChart, Coins, Info, Crown, Sparkles, ArrowUp, ArrowDown, Plus, Minus, Check, RotateCcw,
} from 'lucide-react';
import { useHoldings, useCreateTransaction } from '../../hooks/useHoldings';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import StockLogo from '../../components/ui/StockLogo';
import CreateTransactionDialog from '../holdings/CreateTransactionDialog';
import type { AssetType } from '../../types/holding';
import type { Currency } from '../../types/transaction';

// currencies the transaction form accepts — a holding in anything else (GBp…) is
// recorded with the form's default rather than a value its <select> can't show
const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CHF', 'PLN', 'CZK'];

// ---------- OWNERSHIP TIERS ----------
// Classify a holding by the fraction of the company it represents.
type Tier = 'Meaningful' | 'Small' | 'Tiny' | 'Trace';

const TIER_COLOR: Record<Tier, string> = {
  Meaningful: '#10B981', // green
  Small: '#14B8A6',      // teal
  Tiny: '#3B82F6',       // blue
  Trace: '#8B5CF6',      // purple
};

function tierFor(frac: number): Tier {
  if (frac >= 5e-7) return 'Meaningful';
  if (frac >= 2e-8) return 'Small';
  if (frac >= 1e-9) return 'Tiny';
  return 'Trace';
}

// format N ("1 part in N") as "592k" / "1.29M" / "24.4B"
function fmtN(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(n / 1e9 < 10 ? 2 : 1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n / 1e6 < 10 ? 2 : 1) + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'k';
  return Math.round(n).toString();
}

function fmtShares(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

// share counts in the what-if editor: crypto positions are fractional, stock ones aren't
function fmtSh(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

// kill float noise from repeated +/- steps (0.30000000000000004)
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

// One stepper click ≈ 10% of the position, snapped to a clean magnitude so a
// 0.42 BTC holding steps by 0.04 rather than by a whole coin.
function stepFor(base: number): number {
  const s = base / 10;
  if (s >= 1) return Math.max(1, Math.round(s));
  if (s <= 0) return 1;
  return Number(s.toPrecision(1));
}

interface OwnRow {
  ticker: string;
  name: string | null;
  assetType: AssetType | null;
  currency: string | null;
  price: number | null;
  out: number;
  // "base" = what you actually hold; unprefixed = the projection (identical when what-if is off)
  baseYours: number;
  baseFrac: number;
  baseN: number;
  yours: number;
  frac: number;
  N: number;
  delta: number;
  tier: Tier;
}

// ---------- LOG-SCALE OWNERSHIP BAR ----------
// Bar length is proportional to log10(ownership fraction) — longer = bigger slice.
// Faint decade ticks mark each 10x step so the huge spread reads.
// `ghostFrac` (what-if only) marks today's stake so the projected move is visible.
function OwnershipBar({
  frac, ghostFrac, minLog, maxLog, color,
}: { frac: number; ghostFrac?: number | null; minLog: number; maxLog: number; color: string }) {
  const span = maxLog - minLog;
  const pos = (f: number) => (span === 0 ? 1 : Math.max(0.02, (Math.log10(f) - minLog) / span));
  const fill = pos(frac);
  const decades = Math.max(1, Math.round(span));
  const hasGhost = ghostFrac != null && ghostFrac > 0 && Math.abs(ghostFrac - frac) / frac > 1e-9;
  const ghostFill = hasGhost ? pos(ghostFrac) : 0;
  return (
    <div className="relative h-[26px] w-full">
      {/* track */}
      <div className="absolute inset-x-0 top-[9px] bottom-[9px] rounded-full overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        {Array.from({ length: decades - 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-slate-300/60 dark:bg-slate-500/25"
            style={{ left: `${((i + 1) / decades) * 100}%` }}
          />
        ))}
      </div>
      {/* fill */}
      <div
        className="absolute top-[9px] bottom-[9px] left-0 rounded-full min-w-[8px]"
        style={{ width: `${fill * 100}%`, background: `linear-gradient(90deg, ${color}55, ${color})` }}
      />
      {/* projected delta segment + ghost marker of the current (pre-transaction) stake */}
      {hasGhost && (
        <>
          <div
            className="absolute top-[11px] bottom-[11px] opacity-75"
            style={{
              left: `${Math.min(fill, ghostFill) * 100}%`,
              width: `${Math.abs(fill - ghostFill) * 100}%`,
              borderTop: `2px dashed ${color}`,
            }}
          />
          <div
            className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-500 opacity-90"
            style={{ left: `${ghostFill * 100}%`, transform: 'translate(-50%,-50%)' }}
            title="stake today"
          />
        </>
      )}
      {/* leading dot */}
      <div
        className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800"
        style={{ left: `${fill * 100}%`, transform: 'translate(-50%,-50%)', background: color, boxShadow: `0 0 0 1px ${color}66` }}
      />
    </div>
  );
}

// ---------- WHAT-IF CONTROLS ----------
function SharesStepper({
  value, step, dirty, onChange,
}: { value: number; step: number; dirty: boolean; onChange: (v: number) => void }) {
  // While typing, keep the raw text so intermediate states ("0.", "") survive.
  const [draft, setDraft] = useState<string | null>(null);
  const btn =
    'w-6 h-[26px] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 disabled:hover:text-slate-500';
  return (
    <div
      className={`inline-flex items-center h-7 rounded-md overflow-hidden bg-white dark:bg-slate-800 border ${
        dirty ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-300 dark:border-slate-600'
      }`}
    >
      <button
        type="button" className={btn} aria-label="sell shares" disabled={value <= 0}
        onClick={() => { setDraft(null); onChange(Math.max(0, round6(value - step))); }}
      >
        <Minus className="h-3 w-3" strokeWidth={2.5} />
      </button>
      <input
        value={draft ?? fmtSh(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '');
          setDraft(raw);
          const v = parseFloat(raw);
          onChange(Number.isFinite(v) ? Math.max(0, v) : 0);
        }}
        onBlur={() => setDraft(null)}
        className="w-[62px] h-full text-center text-[12.5px] font-semibold tabular-nums bg-transparent border-x border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white outline-none"
      />
      <button
        type="button" className={btn} aria-label="buy shares"
        onClick={() => { setDraft(null); onChange(round6(value + step)); }}
      >
        <Plus className="h-3 w-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function DeltaChip({ delta, suffix = 'sh' }: { delta: number; suffix?: string }) {
  if (!delta) return null;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10.5px] font-bold tabular-nums whitespace-nowrap ${
        up ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-red-600 dark:text-red-400 bg-red-500/10'
      }`}
    >
      {up ? '+' : '−'}{fmtSh(Math.abs(delta))} {suffix}
    </span>
  );
}

export default function OwnershipPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const { data: holdings, isLoading, error } = useHoldings(portfolioId!);
  const { mutateAsync: createTransaction, isPending: recording } = useCreateTransaction(portfolioId!);

  const [simOn, setSimOn] = useState(false);
  const [sim, setSim] = useState<Record<string, number>>({});
  const [recordTicker, setRecordTicker] = useState<string | null>(null);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading ownership" message={(error as Error).message} />;

  const base = (holdings ?? [])
    // STOCK → shares outstanding; CRYPTO → circulating supply. CUSTOM has no such
    // figure (null) so it's naturally excluded by the sharesOutstanding check.
    .filter((h) => h.shareAmount > 0 && h.sharesOutstanding && h.sharesOutstanding > 0)
    .map((h) => {
      const yours = h.shareAmount;
      const out = h.sharesOutstanding as number;
      const frac = yours / out;
      return {
        ticker: h.ticker, name: h.name, assetType: h.assetType,
        currency: h.currency ?? null, price: h.currentShareValue,
        out, baseYours: yours, baseFrac: frac, baseN: out / yours,
      };
    });

  if (base.length === 0) {
    return (
      <EmptyState
        icon={Crown}
        title="No ownership data yet"
        description="Add stock or crypto holdings (with shares-outstanding / circulating-supply data) to see how much of each you actually own."
      />
    );
  }

  // rank before the projection, so the table can show which positions moved
  const baseRank: Record<string, number> = {};
  [...base].sort((a, b) => b.baseFrac - a.baseFrac).forEach((r, i) => { baseRank[r.ticker] = i + 1; });

  const rows: OwnRow[] = base
    .map((r) => {
      const yours = simOn && sim[r.ticker] != null ? sim[r.ticker] : r.baseYours;
      const frac = yours > 0 ? yours / r.out : 0;
      return {
        ...r,
        yours, frac,
        N: yours > 0 ? r.out / yours : Infinity,
        delta: round6(yours - r.baseYours),
        tier: tierFor(frac > 0 ? frac : r.baseFrac),
      };
    })
    .sort((a, b) => b.frac - a.frac);

  // scale spans both projected and current stakes so ghost markers stay on the track
  const logs = [...rows.filter((r) => r.frac > 0).map((r) => Math.log10(r.frac)), ...base.map((r) => Math.log10(r.baseFrac))];
  const minLog = Math.min(...logs);
  const maxLog = Math.max(...logs);

  const totalShares = rows.reduce((s, r) => s + r.yours, 0);
  const baseTotal = base.reduce((s, r) => s + r.baseYours, 0);
  const changed = rows.filter((r) => r.delta !== 0);
  const dirty = changed.length > 0;
  const held = rows.filter((r) => r.yours > 0);
  const largest = held[0];                 // max frac -> min N
  const smallest = held[held.length - 1];  // min frac -> max N

  const reset = () => setSim({});
  const setShares = (ticker: string, v: number) => setSim((s) => ({ ...s, [ticker]: Math.max(0, v) }));

  const recordRow = recordTicker ? rows.find((r) => r.ticker === recordTicker) ?? null : null;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900 dark:text-white">Ownership</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            How much of each company or coin you actually own — ranked by stake
          </p>
        </div>
        <div className="flex items-center gap-2">
          {simOn && dirty && (
            <button
              type="button" onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          <button
            type="button" onClick={() => setSimOn((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-semibold border ${
              simOn
                ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> {simOn ? 'What-if on' : 'What-if'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Target} label="Largest stake"
          value={largest ? `1 in ${fmtN(largest.N)}` : '—'}
          sub={largest ? (largest.delta ? `${largest.ticker} · was 1 in ${fmtN(largest.baseN)}` : `${largest.ticker} · ${largest.name ?? ''}`) : 'all positions closed'}
          accent={TIER_COLOR.Meaningful}
        />
        <StatCard
          icon={PieChart} label="Smallest stake"
          value={smallest ? `1 in ${fmtN(smallest.N)}` : '—'}
          sub={smallest ? (smallest.delta ? `${smallest.ticker} · was 1 in ${fmtN(smallest.baseN)}` : `${smallest.ticker} · ${smallest.name ?? ''}`) : 'all positions closed'}
          accent={TIER_COLOR.Trace}
        />
        <StatCard
          icon={Coins} label="Shares held" value={fmtShares(totalShares)}
          sub={dirty ? `projected · now ${fmtShares(baseTotal)}` : `across ${held.length} ${held.length === 1 ? 'position' : 'positions'}`}
          accent="#4F46E5"
        />
      </div>

      {/* table card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="text-[14px] font-semibold text-slate-900 dark:text-white">Your slice of the pie</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">Sorted by ownership — largest first</div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
            <Info className="h-3.5 w-3.5" /> log scale · each tick = 10× rarer
          </div>
        </div>

        {/* what-if strip */}
        {simOn && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 border-b border-slate-100 dark:border-slate-700">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[12.5px] font-semibold text-slate-900 dark:text-white">What-if transaction</span>
            <span className="text-[12px] text-slate-500 dark:text-slate-400">
              Edit any share count to project your stake after buying or selling — nothing is saved.
            </span>
            <div className="flex-1" />
            {dirty ? (
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {changed.length} position{changed.length > 1 ? 's' : ''} ·{' '}
                  <span className="text-slate-400 dark:text-slate-500">{fmtSh(baseTotal)}</span>
                  {' → '}
                  <span className="font-bold text-slate-900 dark:text-white">{fmtSh(round6(totalShares))} sh</span>
                </span>
                <DeltaChip delta={round6(totalShares - baseTotal)} />
              </div>
            ) : (
              <span className="text-[11.5px] text-slate-400 dark:text-slate-500 tabular-nums">no changes yet</span>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <th className="text-left px-5 py-2.5 font-bold">Rank · Ticker</th>
                <th className="text-right px-3.5 py-2.5 font-bold">{simOn ? 'Your shares · what-if' : 'Your shares'}</th>
                <th className="text-right px-3.5 py-2.5 font-bold">Shares outstanding</th>
                <th className="text-right px-3.5 py-2.5 font-bold">Ownership %</th>
                <th className="text-left px-3.5 py-2.5 font-bold w-[300px] min-w-[240px]">Relative stake (log scale)</th>
                <th className="text-right px-5 py-2.5 font-bold">1 part in…</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const color = TIER_COLOR[r.tier];
                const rankMove = baseRank[r.ticker] - (i + 1);
                const exited = r.yours <= 0;
                return (
                  <tr
                    key={r.ticker}
                    className={`border-t border-slate-100 dark:border-slate-700 transition-colors ${
                      r.delta
                        ? 'bg-indigo-50/60 dark:bg-indigo-500/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/15'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    {/* rank + ticker */}
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="w-[30px] inline-flex items-center justify-end gap-0.5 text-[12px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                          {i + 1}
                          {simOn && rankMove !== 0 && (
                            rankMove > 0
                              ? <ArrowUp className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
                              : <ArrowDown className="h-3 w-3 text-red-500" strokeWidth={2.5} />
                          )}
                        </span>
                        <StockLogo ticker={r.ticker} name={r.name} assetType={r.assetType} size="sm" />
                        <div>
                          <div className="text-[13px] font-semibold text-slate-900 dark:text-white tabular-nums">{r.ticker}</div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400">{r.name}</div>
                        </div>
                      </div>
                    </td>
                    {/* shares — editable in what-if mode */}
                    <td className="px-3.5 py-3 text-right text-[12.5px] font-medium text-slate-900 dark:text-white tabular-nums">
                      {simOn ? (
                        <div className="flex flex-col items-end gap-1">
                          <SharesStepper
                            value={r.yours} step={stepFor(r.baseYours)} dirty={Boolean(r.delta)}
                            onChange={(v) => setShares(r.ticker, v)}
                          />
                          {Boolean(r.delta) && (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-[10.5px] text-slate-400 dark:text-slate-500">from {fmtSh(r.baseYours)}</span>
                              <DeltaChip delta={r.delta} />
                            </span>
                          )}
                        </div>
                      ) : fmtSh(r.yours)}
                    </td>
                    <td className="px-3.5 py-3 text-right text-[12.5px] text-slate-500 dark:text-slate-400 tabular-nums">{fmtShares(r.out)}</td>
                    <td className="px-3.5 py-3 text-right text-[12.5px] font-semibold text-slate-900 dark:text-white tabular-nums">
                      <div>{exited ? '—' : (r.frac * 100).toPrecision(2) + '%'}</div>
                      {Boolean(r.delta) && (
                        <div className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                          was {(r.baseFrac * 100).toPrecision(2)}%
                        </div>
                      )}
                    </td>
                    {/* log bar */}
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1">
                          {exited ? (
                            <div className="h-[26px] flex items-center text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">position closed</div>
                          ) : (
                            <OwnershipBar
                              frac={r.frac} ghostFrac={r.delta ? r.baseFrac : null}
                              minLog={minLog} maxLog={maxLog} color={color}
                            />
                          )}
                        </div>
                        <span
                          className="shrink-0 w-[72px] text-center text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap"
                          style={{ color, background: `${color}1F` }}
                        >
                          {r.tier}
                        </span>
                      </div>
                    </td>
                    {/* 1 in N */}
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-baseline gap-1 tabular-nums">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">1 in</span>
                        <span className="text-[16px] font-bold text-slate-900 dark:text-white tracking-tight">{exited ? '∞' : fmtN(r.N)}</span>
                      </div>
                      {Boolean(r.delta) && (
                        <div className="text-[10.5px] text-slate-400 dark:text-slate-500 tabular-nums mt-px">was 1 in {fmtN(r.baseN)}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* legend */}
        <div className="flex flex-wrap gap-3.5 items-center px-5 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400">
          {(Object.keys(TIER_COLOR) as Tier[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLOR[k] }} /> {k}
            </span>
          ))}
          {simOn && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-500" /> stake today
            </span>
          )}
          <span className="ml-auto tabular-nums">
            {simOn ? 'Projection assumes outstanding share count unchanged' : 'Outstanding shares as of last provider update'}
          </span>
        </div>
      </div>

      {/* commit bar */}
      {simOn && dirty && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <Info className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <span className="text-[12.5px] text-slate-500 dark:text-slate-400">
            Projection only. Record it as a real transaction to update your holdings.
          </span>
          <div className="flex-1" />
          <button
            type="button" onClick={reset}
            className="rounded-md px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Discard
          </button>
          <button
            type="button" onClick={() => setRecordTicker(changed[0].ticker)}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-indigo-500"
          >
            <Check className="h-3.5 w-3.5" />
            {changed.length > 1 ? `Record ${changed.length} transactions` : 'Record transaction'}
          </button>
        </div>
      )}

      {/* Record one changed position at a time; on success drop it from the projection
          (holdings refetch makes it real) and move on to the next changed row. */}
      {recordRow && (
      <CreateTransactionDialog
        open
        onClose={() => setRecordTicker(null)}
        isPending={recording}
        portfolioId={portfolioId!}
        initial={{
          assetType: recordRow.assetType ?? 'STOCK',
          transactionType: recordRow.delta > 0 ? 'BUY' : 'SELL',
          ticker: recordRow.ticker,
          quantity: String(Math.abs(recordRow.delta)),
          price: recordRow.price != null ? String(recordRow.price) : '',
          ...(SUPPORTED_CURRENCIES.includes(recordRow.currency as Currency)
            ? { currency: recordRow.currency as Currency }
            : {}),
        }}
        onSubmit={async (payload) => {
          const done = recordRow.ticker;
          await createTransaction(payload);
          setSim((s) => {
            const next = { ...s };
            delete next[done];
            return next;
          });
          const remaining = changed.find((c) => c.ticker !== done);
          setRecordTicker(remaining ? remaining.ticker : null);
        }}
      />
      )}
    </div>
  );
}
