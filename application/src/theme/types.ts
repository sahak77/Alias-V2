/**
 * Theme contracts for the Alias multi-theme system.
 *
 * Design: a strict **superset** of semantic tokens that EVERY theme implements
 * (so primitives never hardcode hex or branch on theme name), plus OPTIONAL
 * {@link Decoration} groups (gradients/glass/glow/3D buttons/…) that themes opt
 * into — keeping the flat "classic" theme clean while arcade/vivid layer on
 * richer treatments. See `application/design/*.html`.
 */

import type { TextStyle } from 'react-native';

export type ThemeKey = 'classic' | 'arcade' | 'vivid';
/** User appearance preference. `system` follows the OS; ignored by dark-only themes. */
export type Appearance = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

/** Schema version for the persisted theme preference (migration-ladder anchor). */
export const THEME_SCHEMA_VERSION = 1;

/**
 * Required semantic colors. Every theme/mode implements all of these so any
 * component can reference them unconditionally.
 */
export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  // Gameplay actions — required: the Correct/Skip/Foul bar exists in every theme.
  correct: string;
  onCorrect: string;
  skip: string;
  onSkip: string;
  foul: string;
  onFoul: string;
  // Semantic status (share gameplay hues but stay nameable for non-gameplay UI).
  success: string;
  warning: string;
  danger: string;
  // Chrome.
  overlay: string;
  // Word card — decoupled from surface/text so vivid's cream "paper" works on dark chrome.
  wordCardBg: string;
  wordCardText: string;
  // Timer ring.
  timerFill: string;
  timerTrack: string;
}

export interface Spacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

/** Radius scale. Dark themes alias `sm`→`md` so `radii.sm` is always defined. */
export interface Radii {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export type TypographyVariant =
  | 'display'
  | 'timer'
  | 'title'
  | 'heading'
  | 'body'
  | 'label'
  | 'caption';

export type Typography = Record<TypographyVariant, TextStyle>;

/** Per-role font family. Empty today (system stack); custom fonts drop in here later. */
export type Fonts = Partial<Record<TypographyVariant | 'wordDisplay', string>>;

/** The gameplay-critical word display, separate from the `display` scale role. */
export interface WordDisplay {
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  lineHeight: number;
  letterSpacing?: number;
}

// ---------------------------------------------------------------------------
// Optional decoration groups — primitives feature-detect these.
// ---------------------------------------------------------------------------

/** A linear gradient as [from → to] at `angle` degrees (default 180 = top→bottom). */
export interface GradientStops {
  from: string;
  to: string;
  angle?: number;
}

export interface Gradients {
  background?: GradientStops;
  primaryButton?: GradientStops;
  correctButton?: GradientStops;
  skipButton?: GradientStops;
  foulButton?: GradientStops;
  card?: GradientStops;
  golden?: GradientStops;
}

/** Glassmorphic fill — approximated with a translucent fill+line today (blur later). */
export interface Glass {
  fill: string;
  line: string;
  /** Backdrop blur radius for when a native blur is wired in; unused for now. */
  blurRadius?: number;
}

/** Color-matched neon halo. Primitives set shadowColor to the element's own color. */
export interface Glow {
  radius: number;
  /** Whether the large word/display text itself glows (arcade yes, vivid no). */
  textShadow: boolean;
}

/** A single drop-shadow preset mapped to RN shadow* + Android elevation. */
export interface ShadowToken {
  color: string;
  opacity: number;
  radius: number;
  offsetY: number;
  elevation: number;
}

export interface Elevation {
  sm: ShadowToken;
  md: ShadowToken;
  lg: ShadowToken;
}

/** Chunky pushable button model: a colored bottom shadow that compresses on press. */
export interface Button3d {
  offset: number;
  pressedOffset: number;
}

/** Soft semantic background tints (chips, leader rows, ghost foul button). */
export interface SoftTints {
  primary: string;
  correct: string;
  skip: string;
  foul: string;
}

/** Ordered 8-color team palette (team dots/chips/intro). */
export type TeamColors = readonly [string, string, string, string, string, string, string, string];

/** Named motion durations (ms) + a reduced-motion gate. */
export interface Motion {
  fast: number;
  base: number;
  slow: number;
}

export interface Decoration {
  gradients?: Gradients;
  glass?: Glass;
  glow?: Glow;
  elevation?: Elevation;
  button3d?: Button3d;
  softTints?: SoftTints;
  teamColors?: TeamColors;
  motion?: Motion;
}

/** A fully-resolved theme handed to components via `useTheme()`. */
export interface Theme {
  key: ThemeKey;
  mode: ColorScheme;
  colors: ThemeColors;
  spacing: Spacing;
  radii: Radii;
  typography: Typography;
  wordDisplay: WordDisplay;
  fonts: Fonts;
  decoration?: Decoration;
}

/** Everything in a Theme except the resolver-stamped `key`/`mode`. */
export type ThemeVariant = Omit<Theme, 'key' | 'mode'>;

/** A theme with one or two modes. `dark` is always present; `light` only for classic. */
export interface ThemeDefinition {
  key: ThemeKey;
  displayName: string;
  modes: { light?: ThemeVariant; dark: ThemeVariant };
}
