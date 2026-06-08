import { Pressable, type ViewStyle } from 'react-native';
import { useThemedStyles, type Theme } from '@/theme';
import { Card } from './Card';
import { Text } from './Text';

type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Appended to the raw value when `format` is not given (e.g. "s"). */
  suffix?: string;
  /** Full control over the displayed value (e.g. signed scores: +1, −1, 0). */
  format?: (value: number) => string;
  /** Override the container (e.g. a fixed width for inline use). */
  style?: ViewStyle;
};

/** A −/value/+ stepper bounded to [min, max]. Buttons are 44pt touch targets. */
export function Stepper({ value, onChange, min, max, step, suffix = '', format, style }: StepperProps) {
  const styles = useThemedStyles(makeStyles);
  const display = format ? format(value) : `${value}${suffix}`;
  return (
    <Card style={[styles.stepper, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.btn, value <= min && styles.btnDisabled]}
      >
        <Text variant="heading">−</Text>
      </Pressable>
      <Text variant="heading">{display}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase"
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.btn, value >= max && styles.btnDisabled]}
      >
        <Text variant="heading">+</Text>
      </Pressable>
    </Card>
  );
}

const makeStyles = (_theme: Theme) => ({
  stepper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  btn: { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  btnDisabled: { opacity: 0.35 },
});
