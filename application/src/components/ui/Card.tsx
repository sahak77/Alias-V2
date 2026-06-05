import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

/**
 * Themed surface. Glass fill + line on themes that define `decoration.glass`
 * (arcade/vivid); soft material elevation on themes that define
 * `decoration.elevation` (classic/vivid); otherwise a flat surface + hairline.
 */
export function Card({ style, ...rest }: ViewProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const glass = theme.decoration?.glass;
  const shadow = theme.decoration?.elevation?.md;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: glass ? glass.fill : theme.colors.surface,
          borderColor: glass ? glass.line : theme.colors.border,
        },
        shadow
          ? {
              shadowColor: shadow.color,
              shadowOpacity: shadow.opacity,
              shadowRadius: shadow.radius,
              shadowOffset: { width: 0, height: shadow.offsetY },
              elevation: shadow.elevation,
            }
          : null,
        style,
      ]}
      {...rest}
    />
  );
}

const makeStyles = (theme: Theme) => ({
  container: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
