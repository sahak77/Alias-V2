import { Switch, View } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { Text } from './Text';

type ToggleProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Optional secondary line under the label. */
  hint?: string;
};

/** A labelled on/off row backed by the native Switch, themed to `primary`. */
export function Toggle({ label, value, onValueChange, hint }: ToggleProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <View style={styles.labels}>
        <Text variant="label">{label}</Text>
        {hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceMuted }}
        ios_backgroundColor={theme.colors.surfaceMuted}
      />
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.spacing.md,
    minHeight: 44,
  },
  labels: { flex: 1, gap: 2 },
});
