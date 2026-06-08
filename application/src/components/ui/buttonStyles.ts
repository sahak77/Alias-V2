/** Shared helpers for the chunky-3D / gradient button look (arcade/vivid). */

import type { ViewStyle } from 'react-native';
import type { GradientStops, Theme } from '@/theme';

export interface GradientProps {
  colors: readonly [string, string];
  start: { x: number; y: number };
  end: { x: number; y: number };
}

/**
 * Convert {@link GradientStops} to expo-linear-gradient props. `angle` follows
 * CSS conventions: 0° = bottom→top, 90° = left→right, 180° = top→bottom (default).
 */
export function gradientProps(stops: GradientStops): GradientProps {
  const a = ((stops.angle ?? 180) % 360) * (Math.PI / 180);
  const x = Math.sin(a);
  const y = -Math.cos(a);
  return {
    colors: [stops.from, stops.to],
    start: { x: 0.5 - x / 2, y: 0.5 - y / 2 },
    end: { x: 0.5 + x / 2, y: 0.5 + y / 2 },
  };
}

export interface Chunky3dArgs {
  theme: Theme;
  /** Color of the bottom "lip" (a darker shade of the fill). */
  lipColor: string;
  /** When set + the theme has glow, a color-matched neon halo is applied. */
  glowColor?: string;
  pressed: boolean;
}

/**
 * The dynamic style for a pushable 3D button: a colored bottom lip that
 * compresses while the surface drops on press, plus an optional glow. Returns
 * `null` on flat themes (no `decoration.button3d`) so callers fall back to a
 * plain fill. Background color is the caller's responsibility (it may be a
 * gradient instead).
 */
export function chunky3dStyle({ theme, lipColor, glowColor, pressed }: Chunky3dArgs): ViewStyle | null {
  const b3d = theme.decoration?.button3d;
  if (!b3d) return null;
  const glow = theme.decoration?.glow;
  const style: ViewStyle = {
    borderBottomWidth: pressed ? b3d.pressedOffset : b3d.offset,
    borderBottomColor: lipColor,
    transform: pressed ? [{ translateY: b3d.offset - b3d.pressedOffset }] : undefined,
  };
  if (glow && glowColor) {
    style.shadowColor = glowColor;
    style.shadowOpacity = 0.6;
    style.shadowRadius = glow.radius;
    style.shadowOffset = { width: 0, height: 0 };
    style.elevation = 8;
  }
  return style;
}
