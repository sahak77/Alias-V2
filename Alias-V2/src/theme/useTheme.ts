import { useColorScheme } from 'react-native';
import { darkTheme, theme, type Theme } from './index';

/**
 * Returns the theme matching the OS color scheme, plus the active scheme name.
 * Use for dynamic (scheme-dependent) colors; static layout tokens can import
 * `theme` directly in `StyleSheet.create`.
 */
export function useTheme(): { theme: Theme; scheme: 'light' | 'dark' } {
  const scheme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { theme: scheme === 'dark' ? darkTheme : theme, scheme };
}
