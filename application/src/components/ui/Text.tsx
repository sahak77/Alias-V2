import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { theme, useTheme } from '@/theme';
import type { TypographyVariant } from '@/theme/typography';
import type { ThemeColors } from '@/theme/colors';

type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: keyof ThemeColors;
};

export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const { theme: active } = useTheme();
  return <RNText style={[styles[variant], { color: active.colors[color] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  title: theme.typography.title,
  heading: theme.typography.heading,
  body: theme.typography.body,
  label: theme.typography.label,
  caption: theme.typography.caption,
});
