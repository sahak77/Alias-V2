/**
 * Color tokens. Reference these through the theme — never hardcode hex in components.
 * `lightColors` / `darkColors` share the same shape (`ThemeColors`) so styles can be
 * written once and resolved per color scheme via `useTheme()`.
 */

const palette = {
  blue500: '#208AEF',
  blue600: '#1A6FBF',
  blue100: '#E6F4FE',
  white: '#FFFFFF',
  black: '#0B0B0F',
  gray50: '#F7F8FA',
  gray100: '#EDEFF3',
  gray200: '#D9DCE3',
  gray400: '#9AA0AD',
  gray600: '#5C616E',
  gray800: '#2A2D35',
  gray900: '#16181D',
  red500: '#E5484D',
  green500: '#30A46C',
} as const;

export const lightColors = {
  background: palette.white,
  surface: palette.gray50,
  surfaceMuted: palette.gray100,
  border: palette.gray200,
  text: palette.gray900,
  textMuted: palette.gray600,
  textInverse: palette.white,
  primary: palette.blue500,
  primaryPressed: palette.blue600,
  onPrimary: palette.white,
  danger: palette.red500,
  success: palette.green500,
} as const;

export const darkColors = {
  background: palette.black,
  surface: palette.gray900,
  surfaceMuted: palette.gray800,
  border: palette.gray800,
  text: palette.gray50,
  textMuted: palette.gray400,
  textInverse: palette.gray900,
  primary: palette.blue500,
  primaryPressed: palette.blue600,
  onPrimary: palette.white,
  danger: palette.red500,
  success: palette.green500,
} as const;

/** Shared color-token shape. Values are plain strings so light/dark are interchangeable. */
export type ThemeColors = Record<keyof typeof lightColors, string>;
