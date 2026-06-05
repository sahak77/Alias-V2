import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'lg' | 'xl';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  style?: ViewStyle;
};

const HEIGHTS: Record<ButtonSize, number> = { md: 48, lg: 56, xl: 64 };

/**
 * Themed button. Flat fill on themes without `decoration.button3d` (classic);
 * a chunky pushable look — colored bottom "lip" that compresses on press, plus
 * an optional neon glow — on themes that opt in (arcade/vivid).
 */
export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isDisabled = disabled || loading;

  const fill =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'secondary'
        ? theme.colors.surfaceMuted
        : 'transparent';
  const labelColor: keyof Theme['colors'] =
    variant === 'primary' ? 'onPrimary' : variant === 'ghost' ? 'primary' : 'text';

  const button3d = theme.decoration?.button3d;
  const glow = theme.decoration?.glow;
  const lipColor = variant === 'primary' ? theme.colors.primaryPressed : theme.colors.border;
  const is3d = button3d !== undefined && variant !== 'ghost';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={8}
      style={({ pressed }) => {
        const base: ViewStyle = {
          ...styles.base,
          minHeight: HEIGHTS[size],
          backgroundColor: fill,
          opacity: isDisabled ? 0.45 : 1,
        };
        if (is3d && button3d) {
          base.borderBottomWidth = pressed ? button3d.pressedOffset : button3d.offset;
          base.borderBottomColor = lipColor;
          base.transform = pressed ? [{ translateY: button3d.offset - button3d.pressedOffset }] : undefined;
          if (glow && variant === 'primary') {
            base.shadowColor = theme.colors.primary;
            base.shadowOpacity = 0.6;
            base.shadowRadius = glow.radius;
            base.shadowOffset = { width: 0, height: 0 };
            base.elevation = 8;
          }
        } else if (!isDisabled && pressed) {
          // Flat themes: darken/dim on press.
          base.backgroundColor = variant === 'primary' ? theme.colors.primaryPressed : fill;
          base.opacity = 0.9;
        }
        return [base, style];
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors[labelColor]} />
      ) : (
        <Text variant="label" color={labelColor}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  base: {
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});
