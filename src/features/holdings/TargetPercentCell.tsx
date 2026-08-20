import { useEffect, useRef, useState } from 'react';
import { Pencil, Target } from 'lucide-react';

/**
 * "% of Portfolio" cell: current weight plus a click-to-edit target weight.
 * Renders `{current}%` while no target is set and `{current}%/{target}%` once
 * one is.
 *
 * The micro-bar measures progress *toward the target*, not absolute weight: the
 * track runs 0…target, so a full bar means the target is reached. An absolute
 * scale made the only interesting quantity — the gap — sub-pixel for small
 * positions (2.6% against a 2.5% target on a 10% scale is 0.6px of a 56px bar),
 * and pushed every small holding into an unreadable left-hand sliver. With no
 * target there is nothing to progress toward, so it falls back to `scaleMax`.
 *
 * Past the target the bar is full and gets a hatched end cap — every overshoot
 * looks alike by design; the numbers and the tone carry "how far over".
 */

/** drift = current − target; within ±1pp counts as on target */
function driftTone(drift: number) {
  if (drift >= 1) return { text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-700 dark:bg-amber-400' };
  if (drift <= -1) return { text: 'text-teal-700 dark:text-teal-400', bar: 'bg-teal-700 dark:bg-teal-400' };
  return { text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-600 dark:bg-emerald-400' };
}

const NO_TARGET_TONE = { text: 'text-primary dark:text-indigo-400', bar: 'bg-primary dark:bg-indigo-400' };

/** whole numbers stay whole (15%), anything else gets one decimal (7.5%) */
export const formatTarget = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

interface Props {
  current: number;
  target: number | null;
  /** null = target cleared */
  onChange: (value: number | null) => void;
  /** upper bound of the micro-bar, in percent */
  scaleMax?: number;
}

export default function TargetPercentCell({ current, target, onChange, scaleMax = 32 }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const has = target != null;
  const tone = target != null ? driftTone(current - target) : NO_TARGET_TONE;

  const open = () => { setDraft(target != null ? formatTarget(target) : ''); setEditing(true); };

  const commit = () => {
    setEditing(false);
    const n = parseFloat(draft.replace(',', '.'));
    // blank or unparseable clears the target
    onChange(Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n * 10) / 10)) : null);
  };

  // A 0% target means "hold none of this", so any position at all is an overshoot.
  const ratio = target == null ? null
    : target > 0 ? current / target
      : current > 0 ? Infinity : 0;
  const capped = ratio != null && ratio > 1;
  const fillPct = ratio != null
    ? Math.min(ratio, 1) * 100
    : Math.max(0, Math.min(100, (current / scaleMax) * 100));
  const barTitle = ratio == null
    ? `${current.toFixed(1)}% of portfolio`
    : Number.isFinite(ratio)
      ? `${Math.round(ratio * 100)}% of the ${formatTarget(target!)}% target`
      : `${current.toFixed(1)}% held against a 0% target`;

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {editing ? (
        <div className="inline-flex items-center gap-0.5 rounded border border-primary bg-white dark:bg-slate-800 px-1 py-0.5 ring-2 ring-primary/15">
          <input
            ref={inputRef}
            value={draft}
            inputMode="decimal"
            placeholder="—"
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-9 bg-transparent p-0 text-right text-[13px] font-semibold tabular-nums text-slate-900 dark:text-white outline-none"
          />
          <span className="text-[11px] text-slate-400 dark:text-slate-500">%</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          title={has ? `Target ${formatTarget(target)}% — click to edit` : 'Click to set a target %'}
          className="group/tgt -mx-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 tabular-nums transition hover:ring-1 hover:ring-slate-300 dark:hover:ring-slate-600"
        >
          <span className="font-semibold">{current.toFixed(1)}%</span>
          {has && (
            <>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className={`font-semibold ${tone.text}`}>{formatTarget(target)}%</span>
            </>
          )}
          <span className="ml-0.5 text-slate-400 opacity-0 transition-opacity group-hover/tgt:opacity-100">
            {has ? <Pencil className="h-3 w-3" /> : <Target className="h-3 w-3" />}
          </span>
        </button>
      )}
      <div title={barTitle} className="relative h-[3px] w-14 rounded-sm bg-slate-200 dark:bg-slate-700">
        <div className={`absolute inset-y-0 left-0 rounded-sm ${tone.bar}`} style={{ width: `${fillPct}%` }}>
          {/* hatched end cap: the position runs past the end of the track */}
          {capped && (
            <div
              className="absolute inset-y-0 right-0 w-2 rounded-r-sm"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 1.5px, rgba(255,255,255,0.9) 1.5px 3px)' }}
            />
          )}
        </div>
        {/* end stop: marks where the target sits, so a full bar reads as "reached" */}
        {ratio != null && (
          <div className="absolute -top-0.5 -bottom-0.5 right-0 w-0.5 rounded-sm bg-slate-900 dark:bg-slate-200" />
        )}
      </div>
    </div>
  );
}
