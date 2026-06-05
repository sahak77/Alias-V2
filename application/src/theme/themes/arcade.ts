/**
 * Arcade — neon 80s, fun/addictive. Dark-only. Deep purple base, candy
 * pink/cyan/lime, chunky 3D push-buttons, gradients, glassmorphism, neon glow
 * (incl. glowing display text). Source: application/design/arcade.html.
 */

import { spacing } from '../tokens/spacing';
import { makeTypography } from '../tokens/typography';
import type { Radii, ThemeColors, ThemeDefinition, ThemeVariant, WordDisplay } from '../types';

// Dark themes drop a distinct `sm` radius — alias it to `md` so radii.sm is safe.
const radii: Radii = { none: 0, sm: 14, md: 14, lg: 22, xl: 30, full: 9999 };
const wordDisplay: WordDisplay = { fontSize: 46, fontWeight: '700', lineHeight: 48 };

const colors: ThemeColors = {
  background: '#150C2E',
  surface: '#221552',
  surfaceMuted: '#2B1B66',
  border: 'rgba(255,255,255,0.14)',
  text: '#FFFFFF',
  textMuted: '#B9AEE6',
  textInverse: '#150C2E',
  primary: '#9D4EDD',
  primaryPressed: '#6E2AB0',
  onPrimary: '#FFFFFF',
  correct: '#38E66B',
  onCorrect: '#073D17',
  skip: '#FFB020',
  onSkip: '#3D2A00',
  foul: '#FF4D6D',
  onFoul: '#FFFFFF',
  success: '#38E66B',
  warning: '#FFB020',
  danger: '#FF4D6D',
  overlay: 'rgba(8,5,20,0.62)',
  wordCardBg: '#221552',
  wordCardText: '#FFFFFF',
  timerFill: '#21E6E6',
  timerTrack: 'rgba(255,255,255,0.08)',
};

const darkVariant: ThemeVariant = {
  colors,
  spacing,
  radii,
  typography: makeTypography({
    display: { fontSize: 46, lineHeight: 48, fontWeight: '700', letterSpacing: 0 },
    timer: { fontSize: 52, lineHeight: 52, fontWeight: '700', letterSpacing: 0 },
    title: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: 0 },
    heading: { fontSize: 19, lineHeight: 24, fontWeight: '600' },
    body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
    caption: { fontSize: 12, lineHeight: 15, fontWeight: '400' },
  }),
  wordDisplay,
  fonts: {}, // Fredoka attaches here later.
  decoration: {
    motion: { fast: 120, base: 200, slow: 320 },
    glass: { fill: 'rgba(255,255,255,0.06)', line: 'rgba(255,255,255,0.14)', blurRadius: 12 },
    glow: { radius: 22, textShadow: true },
    button3d: { offset: 6, pressedOffset: 1 },
    gradients: {
      background: { from: '#150C2E', to: '#0C0720', angle: 160 },
      primaryButton: { from: '#9D4EDD', to: '#6E2AB0' },
      correctButton: { from: '#69F08F', to: '#38E66B' },
      skipButton: { from: '#FFC859', to: '#FFB020' },
      foulButton: { from: '#FF7088', to: '#FF4D6D' },
      card: { from: '#2B1B66', to: '#221552' },
      golden: { from: '#FFE680', to: '#FFB020', angle: 120 },
    },
    teamColors: ['#FF4D6D', '#36A9FF', '#38E66B', '#FFB020', '#B06BFF', '#21E6E6', '#FF63C6', '#FF8242'],
  },
};

export const arcade: ThemeDefinition = {
  key: 'arcade',
  displayName: 'Arcade',
  modes: { dark: darkVariant },
};
