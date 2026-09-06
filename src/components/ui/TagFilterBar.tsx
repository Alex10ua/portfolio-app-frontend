import { ChevronDown, ChevronRight, Tags } from 'lucide-react';
import Chip from './Chip';

interface Props {
  /** label of the "no filter" chip, e.g. "All watched" / "All payers" */
  allLabel: string;
  tagNames: string[];
  /** tag → row count; omit to render chips without counts */
  counts?: Record<string, number>;
  activeTag: string;
  onTag: (tag: string) => void;
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}

/**
 * Tag filter chips with a hide/show toggle.
 *
 * A user with a hundred tags gets nine rows of chips pushing the actual table off
 * screen, so the cloud folds away. Two rules make hiding safe: the active filter
 * chip stays visible while collapsed (a hidden filter that is still filtering is
 * how you end up staring at an "empty" page), and when expanded the cloud scrolls
 * inside its own box instead of growing without limit.
 */
export default function TagFilterBar({
  allLabel, tagNames, counts, activeTag, onTag, collapsed, onToggle,
}: Props) {
  const filtering = activeTag !== allLabel;

  return (
    <div className="flex flex-wrap items-start gap-2">
      <button
        type="button"
        onClick={() => onToggle(!collapsed)}
        aria-expanded={!collapsed}
        title={collapsed ? 'Show tag filters' : 'Hide tag filters'}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${
          filtering && collapsed
            ? 'border-indigo-500 text-indigo-700 dark:text-indigo-300'
            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        <Tags className="h-3.5 w-3.5" />
        Tags
        <span className="tabular-nums opacity-60">{tagNames.length}</span>
      </button>

      {collapsed ? (
        // keep the live filter reachable — and clearable — while the cloud is hidden
        filtering && (
          <Chip
            label={`#${activeTag}`}
            count={counts?.[activeTag]}
            active
            onClick={() => onTag(allLabel)}
            title="Clear this tag filter"
          />
        )
      ) : (
        <div className="flex flex-wrap items-center gap-2 max-h-[168px] overflow-y-auto pr-1">
          <Chip label={allLabel} count={counts?.[allLabel]} active={!filtering} onClick={() => onTag(allLabel)} />
          {tagNames.map((tag) => (
            <Chip
              key={tag}
              label={`#${tag}`}
              count={counts?.[tag]}
              active={activeTag === tag}
              onClick={() => onTag(tag)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
