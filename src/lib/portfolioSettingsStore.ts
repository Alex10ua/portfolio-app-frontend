import type { PortfolioSettings, TableColumnConfig } from '../types/settings';

/**
 * localStorage mirror of one portfolio's UI settings — the instant-paint cache
 * in front of the server doc (`userSettings.portfolioSettings[pid]`, source of
 * truth). One key per portfolio holds the whole object, so every setting added
 * to PortfolioSettings is cached without touching this file.
 */
const key = (pid: string) => `portfolioSettings-${pid}`;

/** Settings written per-field before the single-key mirror existed. */
function readLegacy(pid: string): PortfolioSettings {
  const legacy: PortfolioSettings = {};
  const tableConfig = localStorage.getItem(`tableConfig-${pid}`);
  if (tableConfig) legacy.tableConfig = JSON.parse(tableConfig) as TableColumnConfig[];
  // legacy `chartStart-${pid}` (an absolute 'YYYY-MM') is dropped — the chart now
  // uses relative ranges, so an old pinned month has no equivalent.
  return legacy;
}

export function readLocalPortfolioSettings(pid: string): PortfolioSettings {
  try {
    const raw = localStorage.getItem(key(pid));
    return raw ? (JSON.parse(raw) as PortfolioSettings) : readLegacy(pid);
  } catch {
    return {}; // storage blocked or corrupt entry — fall back to defaults
  }
}

export function writeLocalPortfolioSettings(pid: string, settings: PortfolioSettings) {
  try {
    localStorage.setItem(key(pid), JSON.stringify(settings));
  } catch { /* storage blocked */ }
}
