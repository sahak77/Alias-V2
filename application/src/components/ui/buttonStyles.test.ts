import { resolveTheme } from '@/theme';
import { chunky3dStyle } from './buttonStyles';

describe('chunky3dStyle', () => {
  const arcade = resolveTheme('arcade', 'dark', 'dark'); // a theme with decoration.button3d

  // Regression: a transform that toggles between an array (pressed) and
  // `undefined` (released) makes RN's style diff emit `transform: null`, which
  // crashes processTransform on release. It must always be a valid array.
  it('always returns a transform array, never undefined/null', () => {
    for (const pressed of [false, true]) {
      const style = chunky3dStyle({ theme: arcade, lipColor: '#000000', pressed });
      expect(Array.isArray(style?.transform)).toBe(true);
      expect(style?.transform).toHaveLength(1);
    }
  });

  it('drops the surface only while pressed', () => {
    const translateY = (style: ReturnType<typeof chunky3dStyle>): number => {
      const t = style?.transform;
      if (!Array.isArray(t)) throw new Error('expected a transform array');
      return (t[0] as { translateY: number }).translateY;
    };
    expect(translateY(chunky3dStyle({ theme: arcade, lipColor: '#000000', pressed: false }))).toBe(0);
    expect(translateY(chunky3dStyle({ theme: arcade, lipColor: '#000000', pressed: true }))).toBeGreaterThan(0);
  });

  it('returns null on flat themes (no button3d)', () => {
    const classic = resolveTheme('classic', 'light', 'light');
    expect(chunky3dStyle({ theme: classic, lipColor: '#000000', pressed: false })).toBeNull();
  });
});
