/**
 * Classic — refined-playful flat material UI (the canonical design system).
 * The only theme with both light and dark modes. Soft material elevation, soft
 * semantic tints, indigo primary. No gradients/glass/glow/3D buttons.
 * Source: application/design/index.html.
 */

import { spacing } from '../tokens/spacing';
import { baseTypography } from '../tokens/typography';
import type {
  Elevation,
  Motion,
  Radii,
  ThemeColors,
  ThemeDefinition,
  ThemeVariant,
  WordDisplay,
} from '../types';

const radii: Radii = { none: 0, sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };
const wordDisplay: WordDisplay = { fontSize: 44, fontWeight: '800', lineHeight: 48, letterSpacing: -0.5 };
const motion: Motion = { fast: 120, base: 200, slow: 320 };

const elevation: Elevation = {
  sm: { color: '#101828', opacity: 0.1, radius: 3, offsetY: 1, elevation: 1 },
  md: { color: '#101828', opacity: 0.1, radius: 14, offsetY: 4, elevation: 4 },
  lg: { color: '#101828', opacity: 0.18, radius: 40, offsetY: 16, elevation: 12 },
};

const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F7F8FA',
  surfaceMuted: '#EDEFF3',
  border: '#E4E7EE',
  text: '#16181D',
  textMuted: '#5C616E',
  textInverse: '#FFFFFF',
  primary: '#5B5BD6',
  primaryPressed: '#4A4AC4',
  onPrimary: '#FFFFFF',
  correct: '#16A34A',
  onCorrect: '#FFFFFF',
  skip: '#F0A020',
  onSkip: '#16181D',
  foul: '#E5484D',
  onFoul: '#FFFFFF',
  success: '#16A34A',
  warning: '#F0A020',
  danger: '#E5484D',
  overlay: 'rgba(8,9,12,0.55)',
  wordCardBg: '#FFFFFF',
  wordCardText: '#16181D',
  timerFill: '#5B5BD6',
  timerTrack: '#EDEFF3',
};

const darkColors: ThemeColors = {
  background: '#0E0F13',
  surface: '#16181D',
  surfaceMuted: '#21242C',
  border: '#2A2D35',
  text: '#F3F4F6',
  textMuted: '#9AA0AD',
  textInverse: '#16181D',
  primary: '#8585F0',
  primaryPressed: '#7474E4',
  onPrimary: '#0E0F13',
  correct: '#2BB673',
  onCorrect: '#06140C',
  skip: '#F2B33D',
  onSkip: '#16181D',
  foul: '#F4565B',
  onFoul: '#16181D',
  success: '#2BB673',
  warning: '#F2B33D',
  danger: '#F4565B',
  overlay: 'rgba(0,0,0,0.6)',
  wordCardBg: '#16181D',
  wordCardText: '#F3F4F6',
  timerFill: '#8585F0',
  timerTrack: '#21242C',
};

const lightVariant: ThemeVariant = {
  colors: lightColors,
  spacing,
  radii,
  typography: baseTypography,
  wordDisplay,
  fonts: {},
  decoration: {
    elevation,
    motion,
    softTints: { primary: '#ECECFB', correct: '#E5F5EC', skip: '#FCF1DC', foul: '#FCE9EA' },
    teamColors: ['#E5484D', '#2E7DF6', '#16A34A', '#F5A623', '#8B5CF6', '#0EA5A4', '#EC4899', '#F2691E'],
  },
};

const darkVariant: ThemeVariant = {
  colors: darkColors,
  spacing,
  radii,
  typography: baseTypography,
  wordDisplay,
  fonts: {},
  decoration: {
    elevation,
    motion,
    softTints: { primary: '#232248', correct: '#14301F', skip: '#322611', foul: '#321518' },
    teamColors: ['#F4565B', '#4F95FF', '#2BB673', '#F7B73D', '#A07CFF', '#2BC0BF', '#F25CA8', '#FF8242'],
  },
};

export const classic: ThemeDefinition = {
  key: 'classic',
  displayName: 'Classic',
  modes: { light: lightVariant, dark: darkVariant },
};
