import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import { Text } from './Text';

type TimerRingProps = {
  /** Whole seconds remaining (display + arc). */
  remainingSec: number;
  /** Total round length the arc is measured against. */
  totalSec: number;
  /** Force the danger (low-time) style; defaults to remaining ≤ 10s. */
  danger?: boolean;
  size?: number;
};

/** Clamp helper for the progress fraction. */
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Circular countdown ring (spec §6.3). Presentational — it takes the remaining
 * time as a prop; the authoritative timer is the absolute `roundEndTimestamp`
 * in the game session. Arc + number turn to the danger color in the final 10s,
 * with a color-matched glow on themes that opt in.
 */
export function TimerRing({ remainingSec, totalSec, danger, size = 132 }: TimerRingProps) {
  const { theme } = useTheme();
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSec > 0 ? clamp01(remainingSec / totalSec) : 0;
  const isDanger = danger ?? remainingSec <= 10;
  const fillColor = isDanger ? theme.colors.foul : theme.colors.timerFill;
  const glow = theme.decoration?.glow;

  const glowStyle: ViewStyle | null = glow
    ? {
        shadowColor: fillColor,
        shadowOpacity: 0.6,
        shadowRadius: glow.radius,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
      }
    : null;

  return (
    <View
      style={[styles.wrap, { width: size, height: size }, glowStyle]}
      accessibilityRole="timer"
      accessibilityLabel={`${remainingSec} seconds remaining`}
    >
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={theme.colors.timerTrack} strokeWidth={stroke} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={fillColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text variant="timer" color={isDanger ? 'foul' : 'timerFill'}>
          {Math.max(0, Math.round(remainingSec))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
