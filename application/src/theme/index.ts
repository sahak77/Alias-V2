/**
 * Theme barrel. Multi-theme system: a superset token contract every theme
 * implements, plus optional decoration groups. Components consume `useTheme()`
 * + `useThemedStyles()`; the app mounts `<ThemeProvider>` once at the root.
 */

import { resolveTheme } from './registry';
import type { Theme } from './types';

export * from './types';
export { spacing } from './tokens/spacing';
export { baseTypography, makeTypography } from './tokens/typography';
export { themes, themeKeys, resolveTheme } from './registry';
export { useThemeStore } from './store';
export { ThemeProvider } from './ThemeProvider';
export { useTheme } from './useTheme';
export { useThemedStyles } from './useThemedStyles';

/**
 * Static default theme (classic / light) for non-hook contexts — e.g. spacing
 * and radii referenced in module-scope `StyleSheet.create`. For anything color-
 * or theme-dependent, use `useTheme()` / `useThemedStyles()` instead.
 */
export const theme: Theme = resolveTheme('classic', 'light', 'light');
