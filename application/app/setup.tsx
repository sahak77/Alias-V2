import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Button, Card, Screen, SegmentedControl, Text } from '@/components/ui';
import {
  defaultGameConfig,
  MAX_TEAMS,
  useGameSession,
  validateSetup,
  type GameMode,
  type TeamSetup,
} from '@/features/game';
import { buildWordPool, STARTER_EN } from '@/features/packs';
import { DEFAULT_TEAM_COLORS, useTheme, useThemedStyles, type Theme } from '@/theme';

const MODE_OPTIONS = [
  { label: 'Time Score', value: 'time' },
  { label: 'Max Score', value: 'max' },
] as const satisfies readonly { label: string; value: GameMode }[];

export default function SetupScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const startGame = useGameSession((s) => s.startGame);

  const palette = theme.decoration?.teamColors ?? DEFAULT_TEAM_COLORS;
  const colorAt = (i: number): string => palette[i % palette.length] ?? '#888888';

  const [teams, setTeams] = useState<TeamSetup[]>(() => [
    { id: 't1', name: 'Team 1', color: colorAt(0) },
    { id: 't2', name: 'Team 2', color: colorAt(1) },
  ]);
  const [mode, setMode] = useState<GameMode>('time');
  const [duration, setDuration] = useState(60);
  const [roundCount, setRoundCount] = useState(3);
  const [maxScore, setMaxScore] = useState(30);

  const pool = useMemo(() => buildWordPool([STARTER_EN]), []);
  const config = defaultGameConfig({ mode, roundDurationSec: duration, roundCount, maxScore });
  const issues = validateSetup({ config, teams, poolSize: pool.wordIds.length });
  const canStart = issues.length === 0;

  const addTeam = () => {
    if (teams.length >= MAX_TEAMS) return;
    setTeams((prev) => [
      ...prev,
      { id: `t${prev.length + 1}-${Date.now()}`, name: `Team ${prev.length + 1}`, color: colorAt(prev.length) },
    ]);
  };
  const removeTeam = (id: string) => setTeams((prev) => prev.filter((t) => t.id !== id));
  const renameTeam = (id: string, name: string) =>
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));

  const start = () => {
    startGame(config, teams, [STARTER_EN]);
    router.push('/game');
  };

  return (
    <Screen scroll>
      <Text variant="title">New game</Text>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          Teams
        </Text>
        {teams.map((team) => (
          <View key={team.id} style={styles.teamRow}>
            <View style={[styles.dot, { backgroundColor: team.color }]} />
            <TextInput
              value={team.name}
              onChangeText={(name) => renameTeam(team.id, name)}
              placeholder="Team name"
              placeholderTextColor={theme.colors.textMuted}
              maxLength={20}
              style={[
                styles.input,
                { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            />
            {teams.length > 2 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Remove team" hitSlop={8} onPress={() => removeTeam(team.id)} style={styles.remove}>
                <Text variant="heading" color="textMuted">
                  ×
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {teams.length < MAX_TEAMS ? (
          <Button title="Add team" variant="secondary" onPress={addTeam} />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          Game mode
        </Text>
        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          Round timer
        </Text>
        <Stepper value={duration} onChange={setDuration} min={15} max={300} step={15} suffix="s" />
      </View>

      {mode === 'time' ? (
        <View style={styles.section}>
          <Text variant="label" color="textMuted">
            Rounds per team
          </Text>
          <Stepper value={roundCount} onChange={setRoundCount} min={1} max={20} step={1} />
        </View>
      ) : (
        <View style={styles.section}>
          <Text variant="label" color="textMuted">
            Target score
          </Text>
          <Stepper value={maxScore} onChange={setMaxScore} min={10} max={200} step={10} />
        </View>
      )}

      <Text variant="caption" color="textMuted">
        {pool.wordIds.length} words · {STARTER_EN.title} pack
      </Text>
      {!canStart ? (
        <Text variant="caption" color="danger">
          {issues[0]}
        </Text>
      ) : null}

      <Button title="Start Game" size="xl" disabled={!canStart} onPress={start} style={styles.start} />
    </Screen>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
  step,
  suffix = '',
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
      >
        <Text variant="heading">−</Text>
      </Pressable>
      <Text variant="heading">
        {value}
        {suffix}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase"
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
      >
        <Text variant="heading">+</Text>
      </Pressable>
    </Card>
  );
}

const makeStyles = (theme: Theme) => ({
  section: { gap: theme.spacing.sm },
  teamRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing.sm },
  dot: { width: 18, height: 18, borderRadius: theme.radii.full },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
  },
  remove: { width: 40, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const },
  stepper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  stepBtn: { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  stepBtnDisabled: { opacity: 0.35 },
  start: { alignSelf: 'stretch' as const },
});
