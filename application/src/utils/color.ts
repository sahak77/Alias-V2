/** Pure color helpers. */

/**
 * Return `color` with the given alpha as an `rgba(...)` string. Accepts `#RGB`
 * and `#RRGGBB` hex; any other form (already-`rgba`, named) is returned as-is.
 */
export function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#')) return color;
  const hex = color.slice(1);
  if (hex.length === 3) {
    const r = hex.slice(0, 1);
    const g = hex.slice(1, 2);
    const b = hex.slice(2, 3);
    return `rgba(${parseInt(r + r, 16)},${parseInt(g + g, 16)},${parseInt(b + b, 16)},${alpha})`;
  }
  if (hex.length === 6) {
    return `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${alpha})`;
  }
  return color;
}
