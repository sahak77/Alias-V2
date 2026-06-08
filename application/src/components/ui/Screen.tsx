import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { gradientProps } from './buttonStyles';

type ScreenProps = {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (forms, long content). */
  scroll?: boolean;
  contentStyle?: ViewStyle;
  edges?: readonly Edge[];
};

/**
 * Screen scaffold: themed background (a full-bleed gradient on themes that
 * define `decoration.gradients.background`, otherwise a flat `background`) with
 * safe-area insets. Keeps every screen on-theme without per-screen boilerplate.
 */
export function Screen({ children, scroll = false, contentStyle, edges = ['top', 'bottom'] }: ScreenProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bg = theme.decoration?.gradients?.background;

  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
  );

  if (bg) {
    const gp = gradientProps(bg);
    return (
      <LinearGradient colors={gp.colors} start={gp.start} end={gp.end} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={edges}>
          {inner}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} edges={edges}>
      {inner}
    </SafeAreaView>
  );
}

const makeStyles = (theme: Theme) => ({
  flex: { flex: 1 },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
});
