import { View } from 'react-native';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useThemedStyles, type Theme } from '@/theme';
import { activeTeam } from '../engine';
import { useGameSession } from '../useGameSession';

/** Hand-off screen shown before each round (spec §6.2). */
export function GameIntro() {
  const session = useGameSession((s) => s.session);
  const beginRound = useGameSession((s) => s.beginRound);
  const styles = useThemedStyles(makeStyles);

  if (!session) return null;
  const team = activeTeam(session);
  if (!team) return null;

  const { config } = session;
  const roundInfo = session.suddenDeath
    ? 'Sudden death — highest round wins'
    : config.mode === 'max'
      ? `Score ${team.score} / ${config.maxScore}`
      : `Round ${team.roundsPlayed + 1} of ${config.roundCount}`;

  return (
    <Screen>
      <View style={styles.center}>
        <Text variant="label" color="textMuted">
          Pass the phone to
        </Text>
        <Text variant="display" style={[styles.teamName, { color: team.color }]}>
          {team.name}
        </Text>
        <Card style={styles.badge}>
          <Text variant="heading">{team.score} pts</Text>
        </Card>
        <Text variant="heading" color="textMuted">
          {roundInfo}
        </Text>
      </View>
      <Button title="Start Round" size="xl" onPress={beginRound} style={styles.start} />
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: theme.spacing.md },
  teamName: { textAlign: 'center' as const },
  badge: { alignItems: 'center' as const },
  start: { alignSelf: 'stretch' as const },
});
