import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { Text } from './Text';

export type SegmentOption<T extends string> = { label: string; value: T };

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
};

/**
 * Theme/mode/segmented toggle (spec §6.1, §6.6 — also powers the theme picker).
 * Active segment fills with `primary` (+ glow on themes that opt in); the track
 * uses `surfaceMuted`. Segments share width equally.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const glow = theme.decoration?.glow;

  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        const activeStyle: ViewStyle | null = active
          ? {
              backgroundColor: theme.colors.primary,
              ...(glow
                ? {
                    shadowColor: theme.colors.primary,
                    shadowOpacity: 0.5,
                    shadowRadius: glow.radius,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 6,
                  }
                : null),
            }
          : null;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, activeStyle]}
          >
            <Text variant="label" color={active ? 'onPrimary' : 'textMuted'}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  track: {
    flexDirection: 'row' as const,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: theme.radii.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
