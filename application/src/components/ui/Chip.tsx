import { View, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { Text } from './Text';

export type ChipTone = 'neutral' | 'primary' | 'correct' | 'skip' | 'foul';

type ChipProps = {
  label: string;
  tone?: ChipTone;
  style?: ViewStyle;
};

/**
 * Compact tag/badge for difficulty, outcomes, and metadata (spec §6.x). Classic
 * uses soft semantic tints; arcade/vivid use a glass fill with a tone-colored
 * border — pulled entirely from tokens.
 */
export function Chip({ label, tone = 'neutral', style }: ChipProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const soft = theme.decoration?.softTints;
  const glass = theme.decoration?.glass;

  const toneColor = tone === 'neutral' ? theme.colors.textMuted : theme.colors[tone];

  let backgroundColor: string;
  let borderColor: string;
  if (soft) {
    // Classic: soft tinted fill, no border.
    backgroundColor = tone === 'neutral' ? theme.colors.surfaceMuted : soft[tone];
    borderColor = 'transparent';
  } else {
    // Arcade / vivid: glass fill with a tone-colored edge.
    backgroundColor = glass?.fill ?? theme.colors.surfaceMuted;
    borderColor = tone === 'neutral' ? (glass?.line ?? theme.colors.border) : toneColor;
  }

  return (
    <View style={[styles.chip, { backgroundColor, borderColor }, style]}>
      <Text variant="label" style={{ color: toneColor }}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  chip: {
    alignSelf: 'flex-start' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.full,
    borderWidth: 1,
  },
});
