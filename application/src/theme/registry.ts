/** Theme registry + the pure resolver that turns a preference into a Theme. */

import { arcade } from './themes/arcade';
import { classic } from './themes/classic';
import { vivid } from './themes/vivid';
import type { Appearance, ColorScheme, Theme, ThemeDefinition, ThemeKey } from './types';

export const themes: Record<ThemeKey, ThemeDefinition> = { classic, arcade, vivid };

/** Display order for theme pickers. */
export const themeKeys: readonly ThemeKey[] = ['classic', 'arcade', 'vivid'];

/**
 * Resolve a fully-stamped {@link Theme} from the user's theme + appearance and
 * the live OS scheme. Dark-only themes (arcade/vivid) pin to dark regardless of
 * appearance; `appearance` only takes effect on themes that define both modes.
 */
export function resolveTheme(key: ThemeKey, appearance: Appearance, osScheme: ColorScheme): Theme {
  const def = themes[key];
  const requested: ColorScheme = appearance === 'system' ? osScheme : appearance;
  const mode: ColorScheme = def.modes[requested] ? requested : 'dark';
  const variant = def.modes[mode] ?? def.modes.dark;
  return { key: def.key, mode, ...variant };
}
