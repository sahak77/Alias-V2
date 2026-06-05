import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from './useTheme';
import type { Theme } from './types';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Build themed styles once per active theme. Define the factory at module scope
 * (stable identity) so the memo only recomputes when the theme actually changes:
 *
 * ```ts
 * const makeStyles = (t: Theme) => ({ box: { padding: t.spacing.md } });
 * // inside the component:
 * const styles = useThemedStyles(makeStyles);
 * ```
 *
 * Replaces importing the static `theme` inside `StyleSheet.create`, which no
 * longer works now that radii/typography vary per theme.
 */
export function useThemedStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const { theme } = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
}
