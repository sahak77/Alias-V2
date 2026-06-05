import type { TextStyle } from 'react-native';
import type { Typography, TypographyVariant } from '../types';

/**
 * Base type scale (the classic design system's). Themes spread this and override
 * only the roles they tune. Font families are intentionally absent — the system
 * stack is used today; per-theme custom fonts attach via the `fonts` token slot.
 */
export const baseTypography: Typography = {
  display: { fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -0.5 },
  timer: { fontSize: 56, lineHeight: 56, fontWeight: '700', letterSpacing: -1 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};

/** Build a Typography by overriding individual roles on top of {@link baseTypography}. */
export function makeTypography(overrides: Partial<Record<TypographyVariant, TextStyle>> = {}): Typography {
  return {
    display: { ...baseTypography.display, ...overrides.display },
    timer: { ...baseTypography.timer, ...overrides.timer },
    title: { ...baseTypography.title, ...overrides.title },
    heading: { ...baseTypography.heading, ...overrides.heading },
    body: { ...baseTypography.body, ...overrides.body },
    label: { ...baseTypography.label, ...overrides.label },
    caption: { ...baseTypography.caption, ...overrides.caption },
  };
}
