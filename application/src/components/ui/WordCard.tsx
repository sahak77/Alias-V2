import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { withAlpha } from '@/utils/color';
import { gradientProps } from './buttonStyles';
import { Text } from './Text';

type WordCardProps = {
  word: string;
  /** Forbidden related words shown beneath the word in Taboo mode (v2). */
  taboo?: string[];
  /** Golden (bonus) word — gradient surface + dark ink. */
  golden?: boolean;
};

/** Dark ink for the golden gradient surface (legible on yellow). */
const GOLDEN_INK = '#4A3500';

/**
 * The high-contrast word display (spec §6.3). Uses the theme's dedicated
 * `wordDisplay` type + `wordCardBg`/`wordCardText` — decoupled from the chrome
 * so vivid's cream "paper" stays bright on a dark app. Optional taboo list and
 * golden variant; display text glows only where the theme opts in.
 */
export function WordCard({ word, taboo, golden = false }: WordCardProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const goldenGradient = golden ? theme.decoration?.gradients?.golden : undefined;
  const glow = theme.decoration?.glow;
  const shadow = theme.decoration?.elevation?.lg ?? theme.decoration?.elevation?.md;
  const wd = theme.wordDisplay;

  const inkColor = golden ? GOLDEN_INK : theme.colors.wordCardText;
  const wordStyle = {
    fontSize: wd.fontSize,
    fontWeight: wd.fontWeight,
    lineHeight: wd.lineHeight,
    letterSpacing: wd.letterSpacing,
    color: inkColor,
    textAlign: 'center' as const,
    ...(theme.fonts.wordDisplay ? { fontFamily: theme.fonts.wordDisplay } : {}),
    ...(glow?.textShadow && !golden
      ? { textShadowColor: inkColor, textShadowRadius: glow.radius, textShadowOffset: { width: 0, height: 0 } }
      : {}),
  };

  const dividerColor = withAlpha(inkColor, 0.22);

  const body = (
    <>
      <Text style={wordStyle}>{word}</Text>
      {taboo && taboo.length > 0 ? (
        <View style={[styles.taboo, { borderTopColor: dividerColor }]}>
          <Text variant="caption" style={[styles.tabooLabel, { color: theme.colors.danger }]}>
            DON&apos;T SAY
          </Text>
          {taboo.map((t) => (
            <Text key={t} variant="body" style={[styles.tabooWord, { color: withAlpha(inkColor, 0.6) }]}>
              {t}
            </Text>
          ))}
        </View>
      ) : null}
    </>
  );

  const containerShadow: ViewStyle | null = shadow
    ? {
        shadowColor: shadow.color,
        shadowOpacity: shadow.opacity,
        shadowRadius: shadow.radius,
        shadowOffset: { width: 0, height: shadow.offsetY },
        elevation: shadow.elevation,
      }
    : null;

  if (goldenGradient) {
    const gp = gradientProps(goldenGradient);
    return (
      <LinearGradient colors={gp.colors} start={gp.start} end={gp.end} style={[styles.card, containerShadow]}>
        {body}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.wordCardBg, borderColor: withAlpha(inkColor, 0.08) },
        containerShadow,
      ]}
    >
      {body}
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  card: {
    width: '100%' as const,
    borderRadius: theme.radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  taboo: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderStyle: 'dashed' as const,
    alignItems: 'center' as const,
    gap: 2,
    alignSelf: 'stretch' as const,
  },
  tabooLabel: { letterSpacing: 1.5, textTransform: 'uppercase' as const },
  tabooWord: { textDecorationLine: 'line-through' as const },
});
