import { useSettings } from '../context/SettingsContext';

/** Thin wrapper over SettingsContext — theme is server-synced per user. */
export function useTheme() {
  const { theme, setTheme } = useSettings();
  const dark = theme === 'dark';
  return { dark, toggle: () => setTheme(dark ? 'light' : 'dark') };
}
