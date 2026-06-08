/**
 * Game feedback — the haptics + sound mapping for the §11 event table, gated by
 * the in-app prefs. Haptics are wired now (expo-haptics, bundled in Expo Go, no
 * assets needed); sound is a no-op until bundled audio assets land — drop them
 * into a registry here and call `playSound` from each event. All calls are
 * fire-and-forget and best-effort: a device without a Taptic Engine simply
 * no-ops, so this never throws into the gameplay path.
 */

import * as Haptics from 'expo-haptics';
import { usePrefsStore } from './usePrefsStore';

function haptic(run: () => Promise<unknown>): void {
  if (!usePrefsStore.getState().hapticsEnabled) return;
  void run().catch(() => {});
}

// Sound is intentionally unimplemented until bundled assets exist (offline-first:
// audio must be bundled, never fetched). The toggle + call sites are in place so
// wiring a registry later is a drop-in; for now this is a gated no-op.
function playSound(_event: FeedbackEvent): void {
  if (!usePrefsStore.getState().soundEnabled) return;
  // TODO(sound): play the bundled clip for `_event` once assets are added.
}

export type FeedbackEvent = 'correct' | 'skip' | 'foul' | 'tick' | 'tickUrgent' | 'timesUp' | 'win';

/** Fire the haptic + (future) sound for a game event. Safe to call anywhere. */
export const feedback: Record<FeedbackEvent, () => void> = {
  correct: () => {
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    playSound('correct');
  },
  skip: () => {
    haptic(() => Haptics.selectionAsync());
    playSound('skip');
  },
  foul: () => {
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    playSound('foul');
  },
  // Final-10s ticks: a light pulse that escalates to medium under 5s (spec §4.4/§11).
  tick: () => {
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    playSound('tick');
  },
  tickUrgent: () => {
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    playSound('tickUrgent');
  },
  timesUp: () => {
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    playSound('timesUp');
  },
  win: () => {
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    playSound('win');
  },
};
