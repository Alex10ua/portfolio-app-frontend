import { useQuery } from '@tanstack/react-query';
import { getFxRates } from '../api/fxRates';
import type { FxRates } from '../types/fxRate';

const CACHE_KEY = 'fxRates';

/**
 * Last known rates, kept in localStorage. Every money figure the app shows is
 * converted client-side, so the rates must be available on the first paint —
 * before the network call resolves — or totals would flicker through a wrong
 * value. Rates move once a business day; a stale copy is a fine starting point.
 */
function readCachedRates(): FxRates | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as FxRates;
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedRates(rates: FxRates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rates));
  } catch { /* storage blocked */ }
}

/** Shared FX-rate store: currency code → rateVsEur (units per 1 EUR). */
export function useFxRates() {
  const query = useQuery({
    queryKey: ['fxRates'],
    queryFn: async () => {
      const rates = await getFxRates();
      writeCachedRates(rates);
      return rates;
    },
    initialData: readCachedRates,
    // Dates the cached copy to the epoch so it paints instantly but still counts
    // as stale — the fetch runs on mount and replaces it.
    initialDataUpdatedAt: 0,
    // ECB publishes once per weekday — refetching more often buys nothing.
    staleTime: 6 * 60 * 60 * 1000,
  });

  return query.data ?? {};
}
