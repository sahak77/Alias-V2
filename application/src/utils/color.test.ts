import { withAlpha } from './color';

describe('withAlpha', () => {
  it('expands 6-digit hex to rgba', () => {
    expect(withAlpha('#16181D', 0.5)).toBe('rgba(22,24,29,0.5)');
  });

  it('expands 3-digit hex to rgba', () => {
    expect(withAlpha('#FFF', 0.2)).toBe('rgba(255,255,255,0.2)');
  });

  it('passes through non-hex colors unchanged', () => {
    expect(withAlpha('rgba(0,0,0,0.1)', 0.5)).toBe('rgba(0,0,0,0.1)');
    expect(withAlpha('transparent', 0.5)).toBe('transparent');
  });
});
