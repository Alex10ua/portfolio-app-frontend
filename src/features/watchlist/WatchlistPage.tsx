import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import {
  useAddToWatchlist, useRefreshWatchlistTicker, useRemoveFromWatchlist,
  useSetTargetYield, useWatchlist,
} from '../../hooks/useWatchlist';
import { useAllTags } from '../../hooks/useTags';
import { useSettings } from '../../context/SettingsContext';
import { readLocalPortfolioSettings } from '../../lib/portfolioSettingsStore';
import { FullPageSpinner } from '../../components/ui/Spinner';
import ErrorAlert from '../../components/ui/ErrorAlert';
import AddTickerComposer from './AddTickerComposer';
import WatchlistTab, { ALL_TAGS } from './WatchlistTab';
import YieldTargetTab from './YieldTargetTab';
import { Segmented } from './rowBits';
import type { Timeframe } from './yieldMath';
import type { WatchlistEntry } from '../../types/watchlist';

const TABS = ['Watchlist', 'Yield Target'] as const;
type Tab = typeof TABS[number];

/** Message out of an axios error body, which is where the backend puts its reason. */
function errorText(err: unknown): string {
  const body = (err as { response?: { data?: { error?: string } } })?.response?.data;
  return body?.error ?? (err as Error)?.message ?? 'Something went wrong';
}

/**
 * Watchlist — tickers not owned yet, each watched for the dividend yield at which
 * it becomes a buy. Tab 1 is the list; tab 2 ranks it against each ticker's own
 * historical yield distribution.
 *
 * Chips reuse the tag system rather than a separate grouping: a watched ticker
 * can already carry tags, and tags survive the ticker being bought.
 */
export default function WatchlistPage() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const pid = portfolioId ?? '';

  const { data: entries = [], isLoading, error } = useWatchlist(pid);
  const { data: allTags = [] } = useAllTags(pid);

  const add = useAddToWatchlist(pid);
  const setTarget = useSetTargetYield(pid);
  const remove = useRemoveFromWatchlist(pid);
  const refresh = useRefreshWatchlistTicker(pid);

  const [tab, setTab] = useState<Tab>('Watchlist');
  const [activeTag, setActiveTag] = useState<string>(ALL_TAGS);
  const [filter, setFilter] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('5Y');
  const [threshold, setThreshold] = useState(90);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Hiding the tag cloud is a per-portfolio view pref, so it survives a reload
  // and a portfolio switch re-seeds it like every other setting.
  const { getPortfolioSettings, updatePortfolioSettings } = useSettings();
  const tagsCollapsed = getPortfolioSettings(pid)?.tagFilterCollapsed
    ?? readLocalPortfolioSettings(pid).tagFilterCollapsed ?? false;
  const setTagsCollapsed = (collapsed: boolean) => updatePortfolioSettings(pid, { tagFilterCollapsed: collapsed });

  const tagsByTicker = useMemo(() => {
    const map = new Map<string, string[]>();
    allTags.forEach((doc) => map.set(doc.ticker, doc.tags ?? []));
    return map;
  }, [allTags]);

  // only tags that actually sit on a watched ticker — the rest belong to holdings
  const { tagNames, tagCounts } = useMemo(() => {
    const counts: Record<string, number> = { [ALL_TAGS]: entries.length };
    entries.forEach((entry) => {
      (tagsByTicker.get(entry.ticker) ?? []).forEach((tag) => {
        counts[tag] = (counts[tag] ?? 0) + 1;
      });
    });
    const names = Object.keys(counts).filter((t) => t !== ALL_TAGS).sort();
    return { tagNames: names, tagCounts: counts };
  }, [entries, tagsByTicker]);

  const scoped: WatchlistEntry[] = useMemo(() => {
    if (activeTag === ALL_TAGS) return entries;
    return entries.filter((entry) => (tagsByTicker.get(entry.ticker) ?? []).includes(activeTag));
  }, [entries, activeTag, tagsByTicker]);

  const listed = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return scoped;
    return scoped.filter((entry) => `${entry.ticker} ${entry.name ?? ''}`.toLowerCase().includes(needle));
  }, [scoped, filter]);

  const lastUpdated = useMemo(() => {
    const dates = entries.map((e) => e.priceUpdatedAt).filter(Boolean) as string[];
    return dates.length ? dates.sort()[dates.length - 1] : null;
  }, [entries]);

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorAlert title="Error loading watchlist" message={(error as Error).message} />;

  const handleAdd = (ticker: string, targetYield: number | null) => {
    add.mutate({ ticker, targetYield }, { onSuccess: () => setComposerOpen(false) });
  };
  const handleTarget = (ticker: string, targetYield: number) => setTarget.mutate({ ticker, targetYield });

  const composer = composerOpen ? (
    <AddTickerComposer
      portfolioId={pid}
      onAdd={handleAdd}
      onCancel={() => { setComposerOpen(false); add.reset(); }}
      pending={add.isPending}
      error={add.error ? errorText(add.error) : null}
    />
  ) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900 dark:text-white">Watchlist</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            Tickers you don't own yet — watched for the dividend yield you'd buy them at
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-[12px] text-slate-400 dark:text-slate-500">
          <Eye className="h-3.5 w-3.5" />
          {lastUpdated ? `prices as of ${lastUpdated}` : 'no prices fetched yet'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented options={TABS} active={tab} onChange={setTab} />
        {setTarget.isError && (
          <span className="text-[12px] text-red-600 dark:text-red-400">{errorText(setTarget.error)}</span>
        )}
        {remove.isError && (
          <span className="text-[12px] text-red-600 dark:text-red-400">{errorText(remove.error)}</span>
        )}
        {refresh.isError && (
          <span className="text-[12px] text-red-600 dark:text-red-400">{errorText(refresh.error)}</span>
        )}
      </div>

      {tab === 'Watchlist' ? (
        <WatchlistTab
          entries={listed}
          tagNames={tagNames}
          tagCounts={tagCounts}
          activeTag={activeTag}
          onTag={setActiveTag}
          tagsCollapsed={tagsCollapsed}
          onToggleTags={setTagsCollapsed}
          filter={filter}
          onFilter={setFilter}
          onAddClick={() => setComposerOpen(true)}
          onTarget={handleTarget}
          onRemove={(ticker) => remove.mutate(ticker)}
          onRefresh={(ticker) => refresh.mutate(ticker)}
          refreshing={refresh.isPending ? refresh.variables ?? null : null}
          composer={composer}
          showComposer={composerOpen}
        />
      ) : (
        <YieldTargetTab
          entries={scoped}
          tagNames={tagNames}
          activeTag={activeTag}
          onTag={setActiveTag}
          tagsCollapsed={tagsCollapsed}
          onToggleTags={setTagsCollapsed}
          timeframe={timeframe}
          onTimeframe={setTimeframe}
          threshold={threshold}
          onThreshold={setThreshold}
          expanded={expanded}
          onExpand={setExpanded}
          onTarget={handleTarget}
        />
      )}
    </div>
  );
}
