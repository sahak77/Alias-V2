import { resolveTheme, themeKeys, themes } from './registry';
import type { ThemeColors, ThemeVariant, TypographyVariant } from './types';

const REQUIRED_COLOR_KEYS: (keyof ThemeColors)[] = [
  'background', 'surface', 'surfaceMuted', 'border',
  'text', 'textMuted', 'textInverse',
  'primary', 'primaryPressed', 'onPrimary',
  'correct', 'onCorrect', 'skip', 'onSkip', 'foul', 'onFoul',
  'success', 'warning', 'danger', 'overlay',
  'wordCardBg', 'wordCardText', 'timerFill', 'timerTrack',
];

const TYPOGRAPHY_VARIANTS: TypographyVariant[] = [
  'display', 'timer', 'title', 'heading', 'body', 'label', 'caption',
];

describe('theme registry', () => {
  it('exposes all three themes in display order', () => {
    expect(themeKeys).toEqual(['classic', 'arcade', 'vivid']);
  });

  it.each(themeKeys)('every variant of "%s" implements the full token contract', (key) => {
    const def = themes[key];
    const variants: ThemeVariant[] = [def.modes.light, def.modes.dark].filter(
      (v): v is ThemeVariant => v !== undefined,
    );
    expect(variants.length).toBeGreaterThanOrEqual(1);
    for (const variant of variants) {
      for (const colorKey of REQUIRED_COLOR_KEYS) {
        expect(typeof variant.colors[colorKey]).toBe('string');
        expect(variant.colors[colorKey].length).toBeGreaterThan(0);
      }
      for (const v of TYPOGRAPHY_VARIANTS) {
        expect(variant.typography[v]).toBeDefined();
      }
      // sm radius is always defined (dark themes alias it to md).
      expect(typeof variant.radii.sm).toBe('number');
      // shared spacing scale is identical everywhere.
      expect(variant.spacing.md).toBe(16);
    }
  });
});

describe('resolveTheme', () => {
  it('honors appearance for classic (the light+dark theme)', () => {
    expect(resolveTheme('classic', 'light', 'dark').mode).toBe('light');
    expect(resolveTheme('classic', 'dark', 'light').mode).toBe('dark');
  });

  it('follows the OS scheme when appearance is "system"', () => {
    expect(resolveTheme('classic', 'system', 'dark').mode).toBe('dark');
    expect(resolveTheme('classic', 'system', 'light').mode).toBe('light');
  });

  it('pins dark-only themes to dark regardless of appearance/OS', () => {
    expect(resolveTheme('arcade', 'light', 'light').mode).toBe('dark');
    expect(resolveTheme('vivid', 'system', 'light').mode).toBe('dark');
    expect(resolveTheme('arcade', 'light', 'light').key).toBe('arcade');
  });

  it('stamps key + mode onto the resolved theme', () => {
    const t = resolveTheme('vivid', 'system', 'dark');
    expect(t.key).toBe('vivid');
    expect(t.colors.wordCardBg).toBe('#FFFDF6'); // vivid's cream paper
  });
});
