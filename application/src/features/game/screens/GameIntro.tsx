import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useThemedStyles, type Theme } from '@/theme';
import { activeTeam } from '../engine';
import { useGameSession } from '../useGameSession';

/** Hand-off screen shown before each round (spec §6.2). */
export function GameIntro() {
  const { t } = useTranslation();
  const session = useGameSession((s) => s.session);
  const beginRound = useGameSession((s) => s.beginRound);
  const styles = useThemedStyles(makeStyles);

  if (!session) return null;
  const team = activeTeam(session);
  if (!team) return null;

  const { config } = session;
  const roundInfo = session.suddenDeath
    ? t('game.suddenDeath')
    : config.mode === 'max'
      ? t('game.scoreProgress', { score: team.score, target: config.maxScore })
      : t('game.roundProgress', { current: team.roundsPlayed + 1, total: config.roundCount });

  return (
    <Screen>
      <View style={styles.center}>
        <Text variant="label" color="textMuted">
          {t('game.passPhone')}
        </Text>
        <Text variant="display" style={[styles.teamName, { color: team.color }]}>
          {team.name}
        </Text>
        <Card style={styles.badge}>
          <Text variant="heading">{t('common.points', { count: team.score })}</Text>
        </Card>
        <Text variant="heading" color="textMuted">
          {roundInfo}
        </Text>
      </View>
      <Button title={t('game.startRound')} size="xl" onPress={beginRound} style={styles.start} />
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: theme.spacing.md },
  teamName: { textAlign: 'center' as const },
  badge: { alignItems: 'center' as const },
  start: { alignSelf: 'stretch' as const },
});
