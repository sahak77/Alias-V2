import type { TeamColors } from '../types';

/**
 * Neutral default 8-color team palette. Each theme's `decoration.teamColors`
 * overrides this; it exists so screens never hardcode a palette of their own.
 */
export const DEFAULT_TEAM_COLORS: TeamColors = [
  '#E5484D',
  '#2E7DF6',
  '#16A34A',
  '#F5A623',
  '#8B5CF6',
  '#0EA5A4',
  '#EC4899',
  '#F2691E',
];
