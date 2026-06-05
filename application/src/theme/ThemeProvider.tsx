/**
 * Resolves the active theme from the persisted preference + live OS scheme and
 * provides it through context. Mount once near the app root (above the router).
 * Font loading (expo-font) will hook in here later; the system stack is used now.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { resolveTheme } from './registry';
import { useThemeStore } from './store';
import type { ColorScheme, Theme, ThemeKey } from './types';

interface ThemeContextValue {
  theme: Theme;
  scheme: ColorScheme;
  themeKey: ThemeKey;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeKey = useThemeStore((s) => s.themeKey);
  const appearance = useThemeStore((s) => s.appearance);
  const hydrate = useThemeStore((s) => s.hydrate);
  const osScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const value = useMemo<ThemeContextValue>(() => {
    const theme = resolveTheme(themeKey, appearance, osScheme);
    return { theme, scheme: theme.mode, themeKey };
  }, [themeKey, appearance, osScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Internal: read the provided theme context (null when no provider is mounted). */
export function useThemeContext(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
