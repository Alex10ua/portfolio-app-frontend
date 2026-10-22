import { useState } from 'react';
import { Check, X } from 'lucide-react';
import StockLogo from '../../components/ui/StockLogo';
import { cn } from '../../lib/cn';
import {
  STATUS_LABEL, daysBetween, formatRate, frequencyLabel,
  type CalendarPayment, type ReceiptState,
} from './calendarMath';

type Money = (value: number, currency?: string, decimals?: number) => string;

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatWeekdayDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
export const formatShortDate = (d: Date, withYear = false) =>
  d.toLocaleDateString('en-US', withYear
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' });

/** Share counts come off ex-date maths, so they are fractional more often than not. */
function formatShares(shares: number): string {
  const rounded = Math.round(shares * 10000) / 10000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(4).replace(/0+$/, '');
}

const STATUS_TONE: Record<ReceiptState, { dot: string; fg: string }> = {
  upcoming: { dot: 'bg-slate-400 dark:bg-slate-500', fg: 'text-slate-500 dark:text-slate-400' },
  awaiting: { dot: 'bg-amber-500', fg: 'text-amber-700 dark:text-amber-400' },
  received: { dot: 'bg-emerald-500', fg: 'text-emerald-700 dark:text-emerald-400' },
  missing: { dot: 'bg-red-500', fg: 'text-red-700 dark:text-red-400' },
};

const CHECK_TONE: Record<ReceiptState, string> = {
  upcoming: 'border-2 border-dashed border-slate-400 dark:border-slate-500 text-slate-400 dark:text-slate-500',
  awaiting: 'border-2 border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-500',
  received: 'bg-emerald-600 dark:bg-emerald-500 text-white',
  missing: 'border-2 border-red-500 bg-red-50 dark:bg-red-500/15 text-red-500',
};

function checkTitle(p: CalendarPayment): string {
  switch (p.state) {
    case 'upcoming':
      return `${p.payDate ? 'Pays' : 'Goes ex'} ${formatShortDate(p.anchor)} · click to mark received early`;
    case 'awaiting':
      return p.scheduled
        ? 'Not declared yet · click to confirm once it arrives'
        : `Pay date passed · click to confirm (auto-confirms ${formatShortDate(p.autoOn)})`;
    case 'received':
      return p.natural === 'upcoming' ? 'Marked received early · click to undo' : 'Received · click if it didn’t arrive';
    case 'missing':
      return 'Marked as not received · click once it arrives';
  }
}

/** The 4-state receipt check. */
function ReceiptCheck({ payment: p, popped, onToggle, large = false }: {
  payment: CalendarPayment;
  popped: boolean;
  onToggle: () => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!p.exDateKey}
      title={checkTitle(p)}
      aria-label={`${p.ticker} ${formatShortDate(p.anchor)}: ${STATUS_LABEL[p.state]}`}
      className={cn(
        'group inline-flex shrink-0 items-center justify-center rounded-full transition-colors',
        'hover:bg-slate-400/15 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500',
        'disabled:cursor-default disabled:hover:bg-transparent',
        large ? 'h-11 w-11' : 'h-10 w-10',
      )}
    >
      {/* keyed on the state so the pop replays on every change */}
      <span
        key={p.state}
        className={cn(
          'box-border inline-flex h-[26px] w-[26px] items-center justify-center rounded-full',
          CHECK_TONE[p.state],
          popped && 'cal-pop',
        )}
      >
        {p.state === 'upcoming' ? (
          <Check className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" strokeWidth={3} />
        ) : p.state === 'missing' ? (
          <X className="h-3 w-3" strokeWidth={3} />
        ) : (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        )}
      </span>
    </button>
  );
}

function StatusLabel({ payment: p, detail = true }: { payment: CalendarPayment; detail?: boolean }) {
  const tone = STATUS_TONE[p.state];
  return (
    <span
      title={p.state === 'awaiting' && !p.scheduled
        ? `Auto-confirms on ${formatShortDate(p.autoOn)} unless you uncheck it`
        : p.scheduled ? 'Projected from last year’s payment — not declared yet' : undefined}
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
    >
      <span className={cn('h-[7px] w-[7px] shrink-0 rounded-full', tone.dot)} />
      <span className={cn('font-semibold', tone.fg)}>{STATUS_LABEL[p.state]}</span>
      {detail && p.state === 'awaiting' && !p.scheduled && (
        <span className="text-slate-500 dark:text-slate-400">· auto {formatShortDate(p.autoOn)}</span>
      )}
      {detail && p.scheduled && <span className="text-slate-500 dark:text-slate-400">· projected</span>}
    </span>
  );
}

/** 12 ticks = the stock's payment months; this row's month in brand color. */
function FrequencyStrip({ months, monthIndex }: { months: number[]; monthIndex: number }) {
  return (
    <span
      title={months.length ? `Pays in ${months.map((m) => MONTH_SHORT[m - 1]).join(', ')}` : 'Payment months unknown'}
      className="inline-flex h-2.5 items-end gap-[2px]"
    >
      {MONTH_SHORT.map((label, i) => {
        const here = i === monthIndex;
        const pays = months.includes(i + 1);
        return (
          <span
            key={label}
            className={cn(
              'w-[3px] rounded-[1px]',
              here ? 'h-2.5 bg-indigo-600 dark:bg-indigo-400'
                : pays ? 'h-[7px] bg-slate-400 dark:bg-slate-500'
                  : 'h-[7px] bg-slate-200 dark:bg-slate-700',
            )}
          />
        );
      })}
    </span>
  );
}

/** Withholding tax: country default, click to change the rate for this one payment. */
function WithholdingCell({ payment: p, money, onSave, compact = false }: {
  payment: CalendarPayment;
  money: Money;
  onSave: (rate: number | null) => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const num = parseFloat(value.replace(',', '.'));
  const valid = !Number.isNaN(num) && num >= 0 && num <= 100;
  const sameAsDefault = (rate: number) => Math.abs(rate - p.defaultRate) < 1e-9;
  const origin = p.countryCode ?? 'no default';
  const sub = compact ? 'text-[11px]' : 'text-[12px]';

  const commit = () => {
    if (valid && Math.abs(num - p.rate) > 1e-9) onSave(sameAsDefault(num) ? null : num);
    setEditing(false);
  };

  if (editing) {
    const dirty = p.rateEdited || (valid && !sameAsDefault(num));
    return (
      <div className="flex flex-col items-start gap-[3px]">
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={value}
            inputMode="decimal"
            aria-label={`Withholding rate for ${p.ticker}`}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') setEditing(false);
            }}
            className={cn(
              'box-border rounded px-1.5 text-[12.5px] font-semibold tabular-nums outline-none',
              'border border-indigo-500 bg-white text-slate-900 ring-[3px] ring-indigo-500/20',
              'dark:bg-slate-900 dark:text-white',
              compact ? 'h-6 w-[52px]' : 'h-[26px] w-[60px]',
            )}
          />
          <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">%</span>
        </span>
        {dirty ? (
          <button
            type="button"
            // keep focus in the input so its blur does not commit first
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (p.rateEdited) onSave(null);
              setEditing(false);
            }}
            className={cn(sub, 'font-semibold text-indigo-600 dark:text-indigo-300')}
          >
            Reset to {formatRate(p.defaultRate)}
          </button>
        ) : (
          <span className={cn(sub, 'text-slate-500 dark:text-slate-400')}>
            {p.countryCode ? `${p.countryCode} default` : 'No country default'}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(String(+p.rate.toFixed(3)));
        setEditing(true);
      }}
      disabled={!p.exDateKey}
      title={`${p.countryCode ? `${p.countryCode} default ${formatRate(p.defaultRate)}` : 'No default for this country'} · click to change it for this payment`}
      className={cn('group flex max-w-full flex-col items-start text-left disabled:cursor-default', compact ? 'gap-px' : 'gap-[3px]')}
    >
      <span className={cn('whitespace-nowrap font-semibold tabular-nums text-slate-900 dark:text-white', compact ? 'text-[13px]' : 'text-[13.5px]')}>
        {p.tax > 0 ? `−${money(p.tax, p.currency, 2)}` : money(0, p.currency, 2)}
      </span>
      <span
        className={cn(
          sub,
          'whitespace-nowrap border-b border-dashed tabular-nums group-hover:border-solid',
          p.rateEdited
            ? 'border-indigo-600 font-semibold text-indigo-600 dark:border-indigo-300 dark:text-indigo-300'
            : 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400',
        )}
      >
        {formatRate(p.rate)}{compact ? '' : ' withheld'} · {p.rateEdited ? 'edited' : origin}
      </span>
    </button>
  );
}

function PayDateText({ payment: p }: { payment: CalendarPayment }) {
  if (!p.payDate) {
    return (
      <span
        className="text-slate-400 dark:text-slate-500 font-medium"
        title={`Yahoo reports no pay date for ${p.ticker} — status counts from the ex-date and auto-confirms ${formatShortDate(p.autoOn)}`}
      >
        No pay date
      </span>
    );
  }
  const lag = p.exDate ? daysBetween(p.exDate, p.payDate) : null;
  return (
    <span title={p.payDateEstimated
      ? `Estimated: ex-date + ${p.ticker}’s usual lag${lag != null ? ` (${lag} days)` : ''}`
      : 'Pay date reported by Yahoo'}
    >
      {formatWeekdayDate(p.payDate)}
    </span>
  );
}

export default function CalendarRow({ payment: p, divider, popped, money, onToggle, onSaveRate }: {
  payment: CalendarPayment;
  divider: boolean;
  popped: boolean;
  money: Money;
  onToggle: () => void;
  onSaveRate: (rate: number | null) => void;
}) {
  const exText = p.exDate
    ? formatShortDate(p.exDate, p.exDate.getFullYear() !== p.anchor.getFullYear())
    : '—';
  const sharesLine = `${formatShares(p.shares)} × ${money(p.perShare, p.currency, 2)}`;
  const l1 = 'truncate whitespace-nowrap text-[13.5px] font-semibold tabular-nums text-slate-900 dark:text-white';
  const l2 = 'mt-[3px] truncate whitespace-nowrap text-[12px] tabular-nums text-slate-500 dark:text-slate-400';
  const label = 'mb-0.5 whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400';
  const value = 'truncate whitespace-nowrap text-[13px] font-semibold tabular-nums text-slate-900 dark:text-white';
  const tile = p.payDate ?? p.exDate;

  return (
    <div className={cn(divider && 'border-t border-slate-200 dark:border-slate-700')}>
      {/* desktop: holding · pay date + status · amount · frequency · withholding · ex-date · check */}
      <div className="hidden h-[62px] grid-cols-[minmax(0,2.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1.2fr)_minmax(0,0.95fr)_40px] items-center gap-x-[18px] lg:grid">
        <div className="flex min-w-0 items-center gap-3">
          <StockLogo ticker={p.ticker} name={p.name} size="md" />
          <div className="min-w-0">
            <div className={l1}>{p.name}</div>
            <div className={l2}>{p.ticker}</div>
          </div>
        </div>
        <div className="min-w-0">
          <div className={l1}><PayDateText payment={p} /></div>
          <div className={l2}><StatusLabel payment={p} /></div>
        </div>
        <div className="min-w-0">
          <div className={cn(l1, 'font-bold')}>{money(p.amount, p.currency, 2)}</div>
          <div className={l2}>{sharesLine}</div>
        </div>
        <div className="min-w-0">
          <div className={l1}>{frequencyLabel(p.paymentMonths, p.paymentsPerYear)}</div>
          <div className="mt-[5px] flex"><FrequencyStrip months={p.paymentMonths} monthIndex={p.monthIndex} /></div>
        </div>
        <div className="min-w-0">
          <WithholdingCell payment={p} money={money} onSave={onSaveRate} />
        </div>
        <div className="min-w-0">
          <div className={l1}>{exText}</div>
          <div className={l2}>Ex-dividend date</div>
        </div>
        <div className="flex justify-end">
          <ReceiptCheck payment={p} popped={popped} onToggle={onToggle} />
        </div>
      </div>

      {/* mobile: date tile · name · check, then the desktop columns as a 3-up grid */}
      <div className="pb-3 pt-2.5 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-10 shrink-0 rounded-md border border-slate-200 bg-slate-50 pb-[5px] pt-1 text-center dark:border-slate-700 dark:bg-slate-400/10">
            {/* the row sits under its ex-date's month, so a pay date in the next one names its month */}
            <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              {!p.payDate ? 'Ex'
                : p.payDate.getMonth() !== p.monthIndex ? MONTH_SHORT[p.payDate.getMonth()]
                  : p.payDate.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="text-[16px] font-bold leading-[1.15] tabular-nums text-slate-900 dark:text-white">
              {tile ? tile.getDate() : '—'}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-white">{p.name}</div>
            <div className="mt-0.5 flex items-center gap-2 overflow-hidden whitespace-nowrap text-[11.5px] text-slate-500 dark:text-slate-400">
              <span>{p.ticker} · {frequencyLabel(p.paymentMonths, p.paymentsPerYear)}</span>
              <StatusLabel payment={p} detail={false} />
            </div>
          </div>
          <ReceiptCheck payment={p} popped={popped} onToggle={onToggle} large />
        </div>
        <div className="mt-[9px] grid grid-cols-3 gap-2 pl-[50px]">
          <div className="min-w-0">
            <div className={label}>Amount</div>
            <div className={cn(value, 'font-bold')}>{money(p.amount, p.currency, 2)}</div>
            <div className="mt-px truncate whitespace-nowrap text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{sharesLine}</div>
          </div>
          <div className="min-w-0">
            <div className={label}>Ex-dividend</div>
            <div className={value}>{exText}</div>
          </div>
          <div className="min-w-0">
            <div className={label}>Withholding</div>
            <WithholdingCell payment={p} money={money} onSave={onSaveRate} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
