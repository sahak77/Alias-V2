import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useTheme, useThemedStyles, type Theme, type ThemeColors } from '@/theme';
import { chunky3dStyle, gradientProps } from './buttonStyles';
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
 * Themed button. Flat fill on themes without `decoration.button3d` (classic); a
 * chunky pushable surface — gradient fill (when defined) + bottom lip + glow —
 * on themes that opt in (arcade/vivid).
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
  const b3d = theme.decoration?.button3d;
  const gradient = variant === 'primary' ? theme.decoration?.gradients?.primaryButton : undefined;

  const fill =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'secondary'
        ? theme.colors.surfaceMuted
        : 'transparent';
  const labelColor: keyof ThemeColors =
    variant === 'primary' ? 'onPrimary' : variant === 'ghost' ? 'primary' : 'text';
  const lipColor = variant === 'primary' ? theme.colors.primaryPressed : theme.colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={8}
      {...rest}
    >
      {({ pressed }) => {
        const threeD =
          variant !== 'ghost'
            ? chunky3dStyle({
                theme,
                lipColor,
                glowColor: variant === 'primary' ? theme.colors.primary : undefined,
                pressed,
              })
            : null;
        const opacity = isDisabled ? 0.45 : !b3d && pressed && variant !== 'ghost' ? 0.9 : 1;
        const flatFill =
          !b3d && pressed && variant === 'primary' && !isDisabled ? theme.colors.primaryPressed : fill;
        const surface: ViewStyle = { minHeight: HEIGHTS[size], ...threeD, opacity };
        const content = loading ? (
          <ActivityIndicator color={theme.colors[labelColor]} />
        ) : (
          <Text variant="label" color={labelColor}>
            {title}
          </Text>
        );

        if (gradient) {
          const gp = gradientProps(gradient);
          return (
            <LinearGradient
              colors={gp.colors}
              start={gp.start}
              end={gp.end}
              style={[styles.base, surface, style]}
            >
              {content}
            </LinearGradient>
          );
        }
        return <View style={[styles.base, surface, { backgroundColor: flatFill }, style]}>{content}</View>;
      }}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  base: {
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
});
