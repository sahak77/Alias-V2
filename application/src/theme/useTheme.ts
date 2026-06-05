import { useColorScheme } from 'react-native';
import { resolveTheme } from './registry';
import { useThemeContext } from './ThemeProvider';
import type { ColorScheme, Theme } from './types';

/**
 * The active resolved theme + its color scheme. Reads from {@link ThemeProvider}
 * when mounted; otherwise falls back to the default (classic, OS scheme) so UI
 * primitives still render in isolation (tests, Storybook) without a provider.
 *
 * Keeps the historical `{ theme, scheme }` shape so existing call sites are
 * unaffected — but `theme` is now the user's *selected* theme, not just light/dark.
 */
export function useTheme(): { theme: Theme; scheme: ColorScheme } {
  const ctx = useThemeContext();
  const osScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  if (ctx) return { theme: ctx.theme, scheme: ctx.scheme };
  const theme = resolveTheme('classic', 'system', osScheme);
  return { theme, scheme: theme.mode };
}
