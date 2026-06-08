import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';
import { Button, Screen, SegmentedControl, Stepper, Text, Toggle } from '@/components/ui';
import {
  activePreset,
  buildGameConfig,
  MAX_TEAMS,
  PRESET_KEYS,
  SETUP_BOUNDS,
  useGameSession,
  useSetupStore,
  validateSetup,
  type BuzzerRule,
  type DescribeMode,
  type GameMode,
  type PresetKey,
} from '@/features/game';
import { buildWordPool, STARTER_EN } from '@/features/packs';
import { DEFAULT_TEAM_COLORS, useTheme, useThemedStyles, type Theme } from '@/theme';

/** Render a score with an explicit sign (and a real minus glyph). */
const signed = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : '0');

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export default function SetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const startGame = useGameSession((s) => s.startGame);

  const presetLabels: Record<PresetKey, string> = {
    family: t('setup.presetFamily'),
    party: t('setup.presetParty'),
    hardcore: t('setup.presetHardcore'),
  };

  const modeOptions = [
    { label: t('setup.modeTime'), value: 'time' },
    { label: t('setup.modeMax'), value: 'max' },
  ] as const satisfies readonly { label: string; value: GameMode }[];

  const buzzerOptions = [
    { label: t('setup.buzzerHard'), value: 'hardStop' },
    { label: t('setup.buzzerFinish'), value: 'finishWord' },
  ] as const satisfies readonly { label: string; value: BuzzerRule }[];

  const describeOptions = [
    { label: t('setup.describeDescribe'), value: 'describe' },
    { label: t('setup.describeTaboo'), value: 'taboo' },
  ] as const satisfies readonly { label: string; value: DescribeMode }[];

  const config = useSetupStore((s) => s.config);
  const teams = useSetupStore((s) => s.teams);
  const patchConfig = useSetupStore((s) => s.patchConfig);
  const applyPreset = useSetupStore((s) => s.applyPreset);
  const addTeam = useSetupStore((s) => s.addTeam);
  const removeTeam = useSetupStore((s) => s.removeTeam);
  const renameTeam = useSetupStore((s) => s.renameTeam);
  const setTeamColor = useSetupStore((s) => s.setTeamColor);

  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);

  const palette = theme.decoration?.teamColors ?? DEFAULT_TEAM_COLORS;
  const colorAt = (i: number): string => palette[i % palette.length] ?? '#888888';

  const pool = useMemo(() => buildWordPool([STARTER_EN]), []);
  const gameConfig = buildGameConfig(config);
  const issues = validateSetup({ config: gameConfig, teams, poolSize: pool.wordIds.length });
  const canStart = issues.length === 0;
  const preset = activePreset(config);

  const dupNames = useMemo(() => {
    const seen = new Set<string>();
    return teams.some((t) => {
      const key = normalizeName(t.name);
      if (key.length > 0 && seen.has(key)) return true;
      seen.add(key);
      return false;
    });
  }, [teams]);

  const start = () => {
    startGame(gameConfig, teams, [STARTER_EN]);
    router.push('/game');
  };

  return (
    <Screen scroll>
      <Text variant="title">{t('setup.title')}</Text>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('setup.preset')}
        </Text>
        <View style={styles.presetRow}>
          {PRESET_KEYS.map((key) => {
            const active = preset === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('setup.presetA11y', { label: presetLabels[key] })}
                onPress={() => applyPreset(key)}
                style={[styles.preset, active && styles.presetActive]}
              >
                <Text variant="label" color={active ? 'onPrimary' : 'text'}>
                  {presetLabels[key]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('setup.teams')}
        </Text>
        {teams.map((team, i) => (
          <View key={team.id} style={styles.section}>
            <View style={styles.teamRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('setup.changeColor', { name: team.name })}
                onPress={() => setColorPickerFor((cur) => (cur === team.id ? null : team.id))}
                style={[styles.dot, { backgroundColor: team.color }]}
              />
              <TextInput
                value={team.name}
                onChangeText={(name) => renameTeam(team.id, name)}
                placeholder={t('setup.teamNamePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                maxLength={20}
                style={[
                  styles.input,
                  { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              />
              {teams.length > 2 ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t('setup.removeTeam', { name: team.name })} hitSlop={8} onPress={() => removeTeam(team.id)} style={styles.remove}>
                  <Text variant="heading" color="textMuted">
                    ×
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {colorPickerFor === team.id ? (
              <View style={styles.swatchRow}>
                {palette.map((color) => (
                  <Pressable
                    key={color}
                    accessibilityRole="button"
                    accessibilityLabel={t('setup.colorSwatch', { color })}
                    onPress={() => {
                      setTeamColor(team.id, color);
                      setColorPickerFor(null);
                    }}
                    style={[
                      styles.swatch,
                      { backgroundColor: color },
                      team.color === color && { borderColor: theme.colors.text, borderWidth: 3 },
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ))}
        {dupNames ? (
          <Text variant="caption" color="textMuted">
            {t('setup.duplicateWarning')}
          </Text>
        ) : null}
        {teams.length < MAX_TEAMS ? (
          <Button title={t('setup.addTeam')} variant="secondary" onPress={() => addTeam(colorAt(teams.length))} />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('setup.gameMode')}
        </Text>
        <SegmentedControl options={modeOptions} value={config.mode} onChange={(mode) => patchConfig({ mode })} />
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('setup.roundTimer')}
        </Text>
        <Stepper
          value={config.roundDurationSec}
          onChange={(roundDurationSec) => patchConfig({ roundDurationSec })}
          {...SETUP_BOUNDS.roundDurationSec}
          suffix="s"
        />
      </View>

      {config.mode === 'time' ? (
        <View style={styles.section}>
          <Text variant="label" color="textMuted">
            {t('setup.roundsPerTeam')}
          </Text>
          <Stepper value={config.roundCount} onChange={(roundCount) => patchConfig({ roundCount })} {...SETUP_BOUNDS.roundCount} />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text variant="label" color="textMuted">
              {t('setup.targetScore')}
            </Text>
            <Stepper value={config.maxScore} onChange={(maxScore) => patchConfig({ maxScore })} {...SETUP_BOUNDS.maxScore} />
          </View>
          <Toggle
            label={t('setup.finishRotation')}
            hint={t('setup.finishRotationHint')}
            value={config.finishRotationOnMax}
            onValueChange={(finishRotationOnMax) => patchConfig({ finishRotationOnMax })}
          />
        </>
      )}

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('setup.scoring')}
        </Text>
        <View style={styles.scoreRow}>
          <Text variant="body">{t('setup.correctWord')}</Text>
          <Stepper value={config.correctScore} onChange={(correctScore) => patchConfig({ correctScore })} {...SETUP_BOUNDS.correctScore} format={signed} style={styles.scoreStepper} />
        </View>
        <View style={styles.scoreRow}>
          <Text variant="body">{t('setup.skip')}</Text>
          <Stepper value={config.skipScore} onChange={(skipScore) => patchConfig({ skipScore })} {...SETUP_BOUNDS.skipScore} format={signed} style={styles.scoreStepper} />
        </View>
        <Toggle label={t('setup.penalizeFouls')} value={config.foulEnabled} onValueChange={(foulEnabled) => patchConfig({ foulEnabled })} />
        {config.foulEnabled ? (
          <View style={styles.scoreRow}>
            <Text variant="body">{t('setup.foul')}</Text>
            <Stepper value={config.foulScore} onChange={(foulScore) => patchConfig({ foulScore })} {...SETUP_BOUNDS.foulScore} format={signed} style={styles.scoreStepper} />
          </View>
        ) : null}
        <Toggle label={t('setup.limitSkips')} value={config.skipLimitEnabled} onValueChange={(skipLimitEnabled) => patchConfig({ skipLimitEnabled })} />
        {config.skipLimitEnabled ? (
          <View style={styles.scoreRow}>
            <Text variant="body">{t('setup.maxSkips')}</Text>
            <Stepper value={config.skipLimit} onChange={(skipLimit) => patchConfig({ skipLimit })} {...SETUP_BOUNDS.skipLimit} style={styles.scoreStepper} />
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('setup.timerEnds')}
        </Text>
        <SegmentedControl options={buzzerOptions} value={config.buzzerRule} onChange={(buzzerRule) => patchConfig({ buzzerRule })} />
        <Text variant="caption" color="textMuted">
          {config.buzzerRule === 'hardStop' ? t('setup.buzzerHardHint') : t('setup.buzzerFinishHint')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {t('setup.describeMode')}
        </Text>
        <SegmentedControl options={describeOptions} value={config.describeMode} onChange={(describeMode) => patchConfig({ describeMode })} />
      </View>

      <Text variant="caption" color="textMuted">
        {t('setup.poolInfo', { count: pool.wordIds.length, pack: STARTER_EN.title })}
      </Text>
      {!canStart ? (
        <Text variant="caption" color="danger">
          {/* TODO(i18n): engine validation should return codes to translate */}
          {issues[0]}
        </Text>
      ) : null}

      <Button title={t('setup.start')} size="xl" disabled={!canStart} onPress={start} style={styles.start} />
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  section: { gap: theme.spacing.sm },
  presetRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing.sm },
  preset: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  scoreStepper: { minWidth: 156 },
  teamRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing.sm },
  dot: { width: 24, height: 24, borderRadius: theme.radii.full },
  swatchRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing.sm, paddingLeft: 32 },
  swatch: { width: 32, height: 32, borderRadius: theme.radii.full },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1.5,
  },
  remove: { width: 40, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const },
  scoreRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.spacing.md,
  },
  start: { alignSelf: 'stretch' as const },
});
