import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, Screen, Text } from '@/components/ui';
import { feedback } from '@/features/settings';
import { useThemedStyles, type Theme } from '@/theme';
import { rankedTeams, winner } from '../engine';
import { useGameSession } from '../useGameSession';

/** Celebration + final scoreboard (spec §6.5). */
export function Winner() {
  const { t } = useTranslation();
  const session = useGameSession((s) => s.session);
  const restart = useGameSession((s) => s.restart);
  const quit = useGameSession((s) => s.quit);
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);

  // Celebration feedback once, when the scoreboard first appears (spec §11).
  useEffect(() => {
    feedback.win();
  }, []);

  if (!session) return null;
  const champ = winner(session);
  const ranked = rankedTeams(session);

  const onNewGame = () => {
    quit();
    router.replace('/setup');
  };

  return (
    <Screen scroll>
      <Text style={styles.confetti} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        🎉🏆🎉
      </Text>
      <Text variant="title" style={[styles.center, champ ? { color: champ.color } : null]}>
        {champ ? t('winner.wins', { name: champ.name }) : t('winner.gameOver')}
      </Text>

      <Card>
        {ranked.map((team, index) => (
          <View key={team.id} style={styles.row}>
            <Text variant="label" color="textMuted">
              {index + 1}
            </Text>
            <View style={[styles.dot, { backgroundColor: team.color }]} />
            <Text variant="body" style={styles.name}>
              {team.name}
            </Text>
            <Text variant="heading">{team.score}</Text>
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        <Button title={t('winner.newGame')} variant="secondary" onPress={onNewGame} style={styles.flex} />
        <Button title={t('winner.restart')} onPress={restart} style={styles.flex} />
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  confetti: { fontSize: 48, textAlign: 'center' as const },
  center: { textAlign: 'center' as const },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  dot: { width: 16, height: 16, borderRadius: theme.radii.full },
  name: { flex: 1 },
  actions: { flexDirection: 'row' as const, gap: theme.spacing.md },
  flex: { flex: 1 },
});
