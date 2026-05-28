import { useState, useRef, useEffect } from 'react';
import { X, Hash } from 'lucide-react';
import { useTickerTags, useTagNames, useSetTickerTags } from '../../hooks/useTags';
import { tagColor } from '../../lib/tagColors';

interface TagEditorProps {
  ticker: string;
}

function normalizeTag(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
}

export default function TagEditor({ ticker }: TagEditorProps) {
  const { data: tickerTagsData } = useTickerTags(ticker);
  const { data: allTagNames = [] } = useTagNames();
  const { mutate: setTags, isPending } = useSetTickerTags();

  const [localTags, setLocalTags] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tickerTagsData?.tags) setLocalTags(tickerTagsData.tags);
  }, [tickerTagsData]);

  const normalized = normalizeTag(input);
  const suggestions = allTagNames.filter(
    t => normalized.length > 0 && t.includes(normalized) && !localTags.includes(t)
  );

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag || localTags.includes(tag)) return;
    const next = [...localTags, tag];
    setLocalTags(next);
    setInput('');
    setShowSuggestions(false);
    setTags({ ticker, tags: next });
  }

  function removeTag(tag: string) {
    const next = localTags.filter(t => t !== tag);
    setLocalTags(next);
    setTags({ ticker, tags: next });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      addTag(suggestions.length > 0 && input ? suggestions[0] : input);
    } else if (e.key === 'Backspace' && input === '' && localTags.length > 0) {
      removeTag(localTags[localTags.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="relative">
      <div
        className="flex flex-wrap gap-1.5 min-h-[36px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {localTags.map(tag => {
          const c = tagColor(tag);
          return (
            <span
              key={tag}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 4px 2px 7px',
                borderRadius: 4,
                fontSize: 11, fontWeight: 500,
                background: c + '18',
                color: c,
                border: `1px solid ${c}33`,
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              }}
            >
              <Hash size={9} strokeWidth={2.5} />
              {tag}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeTag(tag); }}
                disabled={isPending}
                style={{
                  background: 'transparent', border: 'none', padding: 0, marginLeft: 1,
                  display: 'flex', alignItems: 'center', cursor: 'pointer', color: c, opacity: 0.7,
                }}
              >
                <X size={11} />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={localTags.length === 0 ? 'Add tag…' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
        />
      </div>

      {showSuggestions && (suggestions.length > 0 || (normalized.length > 0 && !localTags.includes(normalized))) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
          {/* existing suggestions */}
          {suggestions.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Suggestions
              </div>
              {suggestions.map((s, i) => {
                const c = tagColor(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); addTag(s); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${i === 0 ? 'bg-slate-50 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: c, flexShrink: 0, display: 'inline-block' }} />
                    <span className="text-[13px] text-slate-700 dark:text-slate-300 font-medium">#{s}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* create new if doesn't exist */}
          {normalized.length > 0 && !allTagNames.includes(normalized) && !localTags.includes(normalized) && (
            <div className="border-t border-slate-100 dark:border-slate-700/50">
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag(normalized); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <X size={13} className="text-indigo-500 rotate-45" />
                <span className="text-[13px] font-medium text-indigo-600 dark:text-indigo-400">
                  Create <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>#{normalized}</span>
                </span>
                <span className="ml-auto text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-slate-600 rounded px-1">↵</span>
              </button>
            </div>
          )}
        </div>
      )}

      {isPending && (
        <p className="mt-1 text-[10px] text-slate-400">Saving…</p>
      )}
    </div>
  );
}
