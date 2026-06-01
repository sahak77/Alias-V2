import { darkColors, lightColors, type ThemeColors } from './colors';
import { radii } from './radii';
import { spacing } from './spacing';
import { typography } from './typography';

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
};

/**
 * Static theme used in `StyleSheet.create` (defaults to light scheme tokens).
 * For scheme-aware colors at runtime, use `useTheme()` from `@/theme/useTheme`.
 */
export const theme: Theme = {
  colors: lightColors,
  spacing,
  radii,
  typography,
};

export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  radii,
  typography,
};

export { lightColors, darkColors, spacing, radii, typography };
export type { ThemeColors };
export { useTheme } from './useTheme';
