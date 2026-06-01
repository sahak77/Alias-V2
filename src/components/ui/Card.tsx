import { StyleSheet, View, type ViewProps } from 'react-native';
import { theme, useTheme } from '@/theme';

export function Card({ style, ...rest }: ViewProps) {
  const { theme: active } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: active.colors.surface, borderColor: active.colors.border },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
