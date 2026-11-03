import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { pickColor } from '../utils/colors.js';
import { useBudget } from './useBudget.jsx';

const ThemeContext = createContext('light');
const query = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Applies the `dark` class + browser chrome colour and exposes the *resolved* theme to charts. */
export function ThemeProvider({ children }) {
  const { settings } = useBudget();
  const [systemDark, setSystemDark] = useState(() => query().matches);

  useEffect(() => {
    const mq = query();
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0e1512' : '#0B6E5C');
  }, [resolved]);

  return <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>;
}

export const useResolvedTheme = () => useContext(ThemeContext);

/** Map of categoryId → colour for the active month, stable per category position. */
export function useCategoryColors() {
  const { month } = useBudget();
  const theme = useResolvedTheme();
  return useMemo(() => {
    const map = new Map();
    (month?.categories ?? []).forEach((c, i) => map.set(c.id, pickColor(i, theme)));
    return map;
  }, [month, theme]);
}
