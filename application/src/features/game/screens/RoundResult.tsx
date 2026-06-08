import { View } from 'react-native';
import { Button, Card, Chip, Screen, Text } from '@/components/ui';
import type { ChipTone } from '@/components/ui';
import { useThemedStyles, type Theme } from '@/theme';
import { useGameSession } from '../useGameSession';

/** Per-round summary + route to the next step (spec §6.4). */
export function RoundResult() {
  const session = useGameSession((s) => s.session);
  const next = useGameSession((s) => s.next);
  const styles = useThemedStyles(makeStyles);

  if (!session) return null;
  const last = session.rounds[session.rounds.length - 1];
  const team = last ? session.teams.find((t) => t.id === last.teamId) : undefined;
  if (!last || !team) return null;

  const delta = last.scoreDelta;

  return (
    <Screen scroll>
      <Text variant="title" style={styles.center}>
        Round complete
      </Text>
      <Text variant="heading" style={[styles.center, { color: team.color }]}>
        {team.name}
      </Text>

      <View style={styles.tiles}>
        <StatTile count={last.correctWordIds.length} label="Correct" tone="correct" />
        <StatTile count={last.skippedWordIds.length} label="Skipped" tone="skip" />
        <StatTile count={last.fouledWordIds.length} label="Fouls" tone="foul" />
      </View>

      <Card style={styles.deltaCard}>
        <Text variant="display" color={delta >= 0 ? 'success' : 'danger'}>
          {delta >= 0 ? `+${delta}` : `${delta}`}
        </Text>
        <Text variant="body" color="textMuted">
          New total: {team.score} pts
        </Text>
      </Card>

      <Button title="Continue" size="xl" onPress={next} style={styles.continue} />
    </Screen>
  );
}

function StatTile({ count, label, tone }: { count: number; label: string; tone: ChipTone }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.tile} accessible accessibilityLabel={`${count} ${label}`}>
      <Text variant="title">{count}</Text>
      <Chip label={label} tone={tone} />
    </Card>
  );
}

const makeStyles = (theme: Theme) => ({
  center: { textAlign: 'center' as const },
  tiles: { flexDirection: 'row' as const, gap: theme.spacing.sm },
  tile: { flex: 1, alignItems: 'center' as const, gap: theme.spacing.sm },
  deltaCard: { alignItems: 'center' as const, gap: theme.spacing.xs },
  continue: { alignSelf: 'stretch' as const },
});
