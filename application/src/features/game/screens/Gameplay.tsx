import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { ActionButtonBar, Button, Screen, Text, TimerRing, WordCard } from '@/components/ui';
import { feedback, usePrefsStore } from '@/features/settings';
import { useThemedStyles, type Theme } from '@/theme';
import { activeTeam, canFoul, canSkip, liveTeamScore } from '../engine';
import type { WordOutcome } from '../types';
import { useGameSession } from '../useGameSession';
import { useRoundClock } from '../useRoundClock';

/** Ignore a second action tap within this window — mis-tap protection (spec §6.3). */
const MISTAP_MS = 250;

/** The hot-path gameplay screen (spec §6.3). */
export function Gameplay() {
  const session = useGameSession((s) => s.session);
  const cardsById = useGameSession((s) => s.cardsById);
  const pausedRemainingMs = useGameSession((s) => s.pausedRemainingMs);
  const markWord = useGameSession((s) => s.markWord);
  const undo = useGameSession((s) => s.undo);
  const finishRound = useGameSession((s) => s.finishRound);
  const handedness = usePrefsStore((s) => s.handedness);
  const styles = useThemedStyles(makeStyles);

  const paused = pausedRemainingMs !== null;

  const onExpire = useCallback(() => {
    feedback.timesUp();
    finishRound();
  }, [finishRound]);
  // Freeze the clock while paused: an undefined end-timestamp stops the ticker
  // and prevents a stray expiry firing in the background (spec §8).
  const remaining = useRoundClock(paused ? undefined : session?.roundEndTimestamp, onExpire);

  // Resolve the on-screen word with matching feedback, guarded against a rapid
  // double-tap registering twice (which would mark two words, spec §6.3/§11).
  const lastTapAt = useRef(0);
  const mark = useCallback(
    (outcome: WordOutcome) => {
      const now = Date.now();
      if (now - lastTapAt.current < MISTAP_MS) return;
      lastTapAt.current = now;
      feedback[outcome]();
      markWord(outcome);
    },
    [markWord],
  );

  // Escalating warning over the final 10s (light) → 5s (medium), once per second.
  const lastTickSec = useRef<number | null>(null);
  useEffect(() => {
    if (paused || remaining > 10 || remaining < 1) {
      lastTickSec.current = null;
      return;
    }
    if (lastTickSec.current !== remaining) {
      lastTickSec.current = remaining;
      (remaining <= 5 ? feedback.tickUrgent : feedback.tick)();
    }
  }, [remaining, paused]);

  // Leaving the round (iOS swipe-back, Android back, or any navigation) tears
  // down this screen — freeze the round on unmount so the absolute
  // roundEndTimestamp can't keep elapsing off-screen, and persist it so it's
  // resumable from Home. pause() is a no-op unless a round is actively running,
  // so it's harmless on the normal round-ended unmount (spec §8).
  useEffect(() => () => useGameSession.getState().pause(), []);

  if (!session || !session.currentRound) return null;
  const round = session.currentRound;
  const team = activeTeam(session);
  const card = round.currentWordId ? cardsById.get(round.currentWordId) : undefined;
  const totalSec = round.suddenDeath ? session.config.suddenDeathDurationSec : session.config.roundDurationSec;
  const taboo = session.config.describeMode === 'taboo' ? card?.taboo : undefined;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.topRow}>
        <View style={styles.teamTag}>
          <View style={[styles.dot, { backgroundColor: team?.color }]} />
          <Text variant="label">{team?.name}</Text>
        </View>
        <Text variant="heading">{team ? liveTeamScore(session, team.id) : 0} pts</Text>
      </View>

      <View style={styles.center}>
        <TimerRing remainingSec={remaining} totalSec={totalSec} />
        <WordCard word={card?.word ?? '—'} taboo={taboo} />
        <Button
          title="Undo last"
          variant="ghost"
          onPress={undo}
          disabled={round.marks.length === 0}
        />
      </View>

      <ActionButtonBar
        onCorrect={() => mark('correct')}
        onSkip={() => mark('skip')}
        onFoul={canFoul(session) ? () => mark('foul') : undefined}
        skipDisabled={!canSkip(session)}
        reversed={handedness === 'left'}
      />
    </Screen>
  );
}

const makeStyles = (theme: Theme) => ({
  content: { gap: theme.spacing.lg },
  topRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  teamTag: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing.sm },
  dot: { width: 14, height: 14, borderRadius: theme.radii.full },
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: theme.spacing.lg },
});
