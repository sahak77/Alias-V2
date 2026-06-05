import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme, type ThemeColors, type TypographyVariant } from '@/theme';

type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: keyof ThemeColors;
};

/**
 * Themed text primitive. Resolves the per-theme type scale and (later) font
 * family at runtime, so the same `variant` follows whichever theme is active.
 */
export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const { theme } = useTheme();
  const fontFamily = theme.fonts[variant];
  return (
    <RNText
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        fontFamily ? { fontFamily } : null,
        style,
      ]}
      {...rest}
    />
  );
}
