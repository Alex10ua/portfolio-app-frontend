import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number | null;
  onCommit: (targetYield: number) => void;
  disabled?: boolean;
}

/**
 * Inline target-yield input. Typing is local; the value is saved on blur or
 * Enter — a mutation per keystroke would re-rank the whole screen mid-edit.
 */
export default function TargetYieldField({ value, onCommit, disabled }: Props) {
  const [draft, setDraft] = useState(value == null ? '' : value.toFixed(2));
  const editing = useRef(false);

  // adopt server truth again once the field is not being typed into
  useEffect(() => {
    if (!editing.current) setDraft(value == null ? '' : value.toFixed(2));
  }, [value]);

  const commit = () => {
    editing.current = false;
    const parsed = parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft(value == null ? '' : value.toFixed(2));
      return;
    }
    if (value != null && Math.abs(parsed - value) < 1e-9) return;
    onCommit(parsed);
  };

  return (
    <span className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 px-1.5 py-0.5 focus-within:border-indigo-400 dark:focus-within:border-indigo-500">
      <input
        value={draft}
        disabled={disabled}
        inputMode="decimal"
        aria-label="Target yield"
        onFocus={() => { editing.current = true; }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            editing.current = false;
            setDraft(value == null ? '' : value.toFixed(2));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-[38px] bg-transparent text-right text-[13px] font-bold tabular-nums text-slate-900 dark:text-white outline-none disabled:opacity-50"
      />
      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">%</span>
    </span>
  );
}
