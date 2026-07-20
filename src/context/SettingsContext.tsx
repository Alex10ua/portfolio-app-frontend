import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getSettings, saveSettings } from '../api/users';
import type { UserSettings, PortfolioSettings } from '../types/settings';

type Theme = 'light' | 'dark';

interface SettingsContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** true once the server settings for the logged-in user have been applied */
  settingsLoaded: boolean;
  getPortfolioSettings: (pid: string) => PortfolioSettings | undefined;
  updatePortfolioSettings: (pid: string, patch: Partial<PortfolioSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

const emptySettings = (): UserSettings => ({ theme: null, portfolioSettings: {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Theme boots from localStorage / OS immediately — no flash while server loads
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [settings, setSettings] = useState<UserSettings>(emptySettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // refs to avoid stale closures in the debounced push
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const userRef = useRef(user);
  userRef.current = user;
  const lastAckedRef = useRef<string>('');
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsLoadedRef = useRef(false);
  settingsLoadedRef.current = settingsLoaded;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load server settings once per login; server wins over localStorage cache
  useEffect(() => {
    if (!user) {
      setSettings(emptySettings());
      setSettingsLoaded(false);
      lastAckedRef.current = '';
      return;
    }
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (cancelled) return;
        const normalized: UserSettings = {
          theme: s.theme ?? null,
          portfolioSettings: s.portfolioSettings ?? {},
        };
        setSettings(normalized);
        lastAckedRef.current = JSON.stringify(normalized);
        if (normalized.theme) setThemeState(normalized.theme);
        // converge the localStorage cache to server truth
        for (const [pid, ps] of Object.entries(normalized.portfolioSettings)) {
          try {
            if (ps.tableConfig) localStorage.setItem(`tableConfig-${pid}`, JSON.stringify(ps.tableConfig));
            if (ps.chartStartMonth) localStorage.setItem(`chartStart-${pid}`, ps.chartStartMonth);
          } catch { /* storage blocked */ }
        }
        setSettingsLoaded(true);
      })
      .catch(() => {
        // server unavailable — keep localStorage behavior, mark loaded so pages don't wait forever
        if (!cancelled) setSettingsLoaded(true);
      });
    return () => { cancelled = true; };
  }, [user]);

  // Debounced whole-doc push; skipped when nothing changed vs the last server ack.
  // No beforeunload flush on purpose: localStorage still has the value, the next
  // change (any device) re-syncs — losing one debounce window is acceptable.
  const schedulePush = () => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      // never push before the server copy has been applied — a component's
      // mount-time echo of stale localStorage must not clobber the server doc
      if (!userRef.current || !settingsLoadedRef.current) return;
      const doc = settingsRef.current;
      const json = JSON.stringify(doc);
      if (json === lastAckedRef.current) return;
      saveSettings(doc)
        .then(() => { lastAckedRef.current = json; })
        .catch((e) => console.warn('settings sync failed', e));
    }, 800);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    setSettings((prev) => ({ ...prev, theme: t }));
    schedulePush();
  };

  const getPortfolioSettings = (pid: string) => settings.portfolioSettings[pid];

  const updatePortfolioSettings = (pid: string, patch: Partial<PortfolioSettings>) => {
    setSettings((prev) => ({
      ...prev,
      portfolioSettings: {
        ...prev.portfolioSettings,
        [pid]: { ...prev.portfolioSettings[pid], ...patch },
      },
    }));
    try {
      if (patch.tableConfig) localStorage.setItem(`tableConfig-${pid}`, JSON.stringify(patch.tableConfig));
      if (patch.chartStartMonth) localStorage.setItem(`chartStart-${pid}`, patch.chartStartMonth);
    } catch { /* storage blocked */ }
    schedulePush();
  };

  return (
    <SettingsContext.Provider value={{ theme, setTheme, settingsLoaded, getPortfolioSettings, updatePortfolioSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
