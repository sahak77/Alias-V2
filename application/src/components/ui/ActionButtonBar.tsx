import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles, type GradientStops, type Theme, type ThemeColors } from '@/theme';
import { chunky3dStyle, gradientProps } from './buttonStyles';
import { Text } from './Text';

type ActionButtonBarProps = {
  onCorrect: () => void;
  onSkip: () => void;
  /** When omitted, the Foul button is hidden (foul disabled). */
  onFoul?: () => void;
  /** Disable Skip when a per-round skip limit is reached. */
  skipDisabled?: boolean;
  disabled?: boolean;
  /** Mirror the row for left-handed layout (spec §6.1). */
  reversed?: boolean;
};

/** Darker translucent bottom edge for the 3D lip — reads as a chunky button base. */
const LIP = 'rgba(0,0,0,0.28)';

/**
 * The gameplay action row (spec §6.3). Correct + Skip flex to fill; Foul is a
 * fixed square. Every action pairs an icon with its color (never color alone)
 * for color-blind accessibility. Renders flat on classic, chunky 3D + gradient
 * on arcade/vivid.
 */
export function ActionButtonBar({ onCorrect, onSkip, onFoul, skipDisabled, disabled, reversed }: ActionButtonBarProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const soft = theme.decoration?.softTints;
  const g = theme.decoration?.gradients;

  return (
    <View style={[styles.row, reversed && styles.rowReversed]}>
      <ActionButton
        theme={theme}
        style={styles.flex}
        label={t('game.correct')}
        icon="✓"
        fill={theme.colors.correct}
        labelColor="onCorrect"
        gradient={g?.correctButton}
        glowColor={theme.colors.correct}
        onPress={onCorrect}
        disabled={disabled}
      />
      <ActionButton
        theme={theme}
        style={styles.flex}
        label={t('game.skip')}
        icon="↪"
        fill={theme.colors.skip}
        labelColor="onSkip"
        gradient={g?.skipButton}
        glowColor={theme.colors.skip}
        onPress={onSkip}
        disabled={disabled || skipDisabled}
      />
      {onFoul ? (
        <ActionButton
          theme={theme}
          style={styles.square}
          label={t('game.foul')}
          icon="⚑"
          // Classic shows foul as a soft ghost; dark themes use a solid red square.
          fill={soft ? soft.foul : theme.colors.foul}
          labelColor={soft ? 'foul' : 'onFoul'}
          gradient={g?.foulButton}
          glowColor={theme.colors.foul}
          hideLabel
          onPress={onFoul}
          disabled={disabled}
        />
      ) : null}
    </View>
  );
}

type ActionButtonProps = {
  theme: Theme;
  style: ViewStyle;
  label: string;
  icon: string;
  fill: string;
  labelColor: keyof ThemeColors;
  gradient?: GradientStops;
  glowColor: string;
  hideLabel?: boolean;
  onPress: () => void;
  disabled?: boolean;
};

function ActionButton({
  theme,
  style,
  label,
  icon,
  fill,
  labelColor,
  gradient,
  glowColor,
  hideLabel,
  onPress,
  disabled,
}: ActionButtonProps) {
  const radius = theme.radii.lg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={style}
    >
      {({ pressed }) => {
        const threeD = chunky3dStyle({ theme, lipColor: LIP, glowColor, pressed });
        const opacity = disabled ? 0.4 : !theme.decoration?.button3d && pressed ? 0.9 : 1;
        const surface: ViewStyle = {
          minHeight: 88,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          overflow: 'hidden',
          ...threeD,
          opacity,
        };
        const inner = (
          <>
            {/* Fixed glyph size for the action icon; paired with the label so state is never color-only. */}
            <Text variant="heading" color={labelColor} style={{ fontSize: 26, lineHeight: 30 }}>
              {icon}
            </Text>
            {hideLabel ? null : (
              <Text variant="label" color={labelColor}>
                {label}
              </Text>
            )}
          </>
        );
        if (gradient) {
          const gp = gradientProps(gradient);
          return (
            <LinearGradient colors={gp.colors} start={gp.start} end={gp.end} style={surface}>
              {inner}
            </LinearGradient>
          );
        }
        return <View style={[surface, { backgroundColor: fill }]}>{inner}</View>;
      }}
    </Pressable>
  );
}

const makeStyles = (theme: Theme) => ({
  row: { flexDirection: 'row' as const, gap: theme.spacing.sm },
  rowReversed: { flexDirection: 'row-reverse' as const },
  flex: { flex: 1 },
  square: { flexBasis: 88, flexGrow: 0, flexShrink: 0 },
});
