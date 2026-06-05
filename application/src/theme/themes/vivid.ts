/**
 * Vivid — teal & citrus, readability-first. Dark-only. Teal-navy base, mint
 * primary + citrus accents, 3D buttons and gradients like arcade, but glow is
 * box-shadow only (no text glow) and the WordCard is a bright cream "paper"
 * spotlight for maximum word legibility. Source: application/design/vivid.html.
 */

import { spacing } from '../tokens/spacing';
import { makeTypography } from '../tokens/typography';
import type {
  Elevation,
  Radii,
  ThemeColors,
  ThemeDefinition,
  ThemeVariant,
  WordDisplay,
} from '../types';

const radii: Radii = { none: 0, sm: 14, md: 14, lg: 22, xl: 30, full: 9999 };
const wordDisplay: WordDisplay = { fontSize: 56, fontWeight: '800', lineHeight: 59, letterSpacing: -0.5 };

const elevation: Elevation = {
  sm: { color: '#000000', opacity: 0.3, radius: 12, offsetY: 4, elevation: 3 },
  md: { color: '#000000', opacity: 0.45, radius: 44, offsetY: 18, elevation: 12 },
  lg: { color: '#000000', opacity: 0.6, radius: 60, offsetY: 24, elevation: 18 },
};

const colors: ThemeColors = {
  background: '#08171E',
  surface: '#123540',
  surfaceMuted: '#16414E',
  border: 'rgba(255,255,255,0.16)',
  text: '#F2F8F7',
  textMuted: '#A7C2C8',
  textInverse: '#0C2530',
  primary: '#1FD1B9',
  primaryPressed: '#129C8B',
  onPrimary: '#042B27',
  correct: '#36D964',
  onCorrect: '#06310F',
  skip: '#FBB024',
  onSkip: '#3D2A00',
  foul: '#FF5B52',
  onFoul: '#FFFFFF',
  success: '#36D964',
  warning: '#FBB024',
  danger: '#FF5B52',
  overlay: 'rgba(4,16,20,0.62)',
  wordCardBg: '#FFFDF6',
  wordCardText: '#0C2530',
  timerFill: '#1FD1B9',
  timerTrack: 'rgba(255,91,82,0.14)',
};

const darkVariant: ThemeVariant = {
  colors,
  spacing,
  radii,
  typography: makeTypography({
    display: { fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -0.5 },
    timer: { fontSize: 50, lineHeight: 50, fontWeight: '700', letterSpacing: 0 },
    title: { fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: 0 },
    heading: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
    body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
    label: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  }),
  wordDisplay,
  fonts: {}, // Baloo 2 (display) + Outfit (body) attach here later.
  decoration: {
    motion: { fast: 120, base: 200, slow: 320 },
    elevation,
    glass: { fill: 'rgba(255,255,255,0.07)', line: 'rgba(255,255,255,0.16)', blurRadius: 14 },
    glow: { radius: 24, textShadow: false },
    button3d: { offset: 6, pressedOffset: 1 },
    gradients: {
      background: { from: '#0E2A35', to: '#08171E', angle: 165 },
      primaryButton: { from: '#2BE3C9', to: '#1FD1B9' },
      correctButton: { from: '#5CE886', to: '#36D964' },
      skipButton: { from: '#FFC95E', to: '#FBB024' },
      foulButton: { from: '#FF7A72', to: '#FF5B52' },
      card: { from: '#16414E', to: '#123540' },
      golden: { from: '#FFE9A0', to: '#FFCB2D', angle: 120 },
    },
    teamColors: ['#FF5B52', '#2FA8E0', '#36D964', '#FFCB2D', '#1FD1B9', '#FF8A3D', '#7CC230', '#E0466A'],
  },
};

export const vivid: ThemeDefinition = {
  key: 'vivid',
  displayName: 'Vivid',
  modes: { dark: darkVariant },
};
