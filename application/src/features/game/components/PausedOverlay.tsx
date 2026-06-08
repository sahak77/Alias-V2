/**
 * Full-screen Paused scrim shown over an active round when the game was
 * backgrounded or resumed from a kill (spec §8). The round never auto-resumes —
 * the user taps Resume, which re-anchors the timer from the captured remaining.
 */

import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { withAlpha } from '@/utils/color';
import { useThemedStyles, type Theme } from '@/theme';

type PausedOverlayProps = {
  onResume: () => void;
  /** Whole seconds left in the round, shown for reassurance. */
  remainingSec?: number;
};

export function PausedOverlay({ onResume, remainingSec }: PausedOverlayProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.overlay} accessibilityViewIsModal accessibilityLabel="Game paused">
      <View style={styles.body}>
        <Text variant="display">Paused</Text>
        {remainingSec !== undefined ? (
          <Text variant="heading" color="textMuted">
            {remainingSec}s left
          </Text>
        ) : null}
      </View>
      <Button title="Resume" size="xl" onPress={onResume} style={styles.button} />
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: withAlpha(theme.colors.background, 0.94),
  },
  body: { alignItems: 'center' as const, gap: theme.spacing.xs },
  button: { alignSelf: 'stretch' as const },
});
