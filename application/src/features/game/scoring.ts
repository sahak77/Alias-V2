/**
 * Pure scoring math (spec §4.2). Side-effect-free and frame-independent so the
 * UI can show a live total while the authoritative score is always recomputable
 * from the per-word records.
 */

import type { GameConfig } from './types';

/** Resolved-word tallies for a single round. */
export interface RoundCounts {
  correct: number;
  skip: number;
  foul: number;
}

/**
 * Net points for one round:
 * `correct*correctScore + skip*skipScore + foul*foulScore`.
 * Foul contributes 0 when `foulScore` is undefined (foul disabled).
 */
export function roundDelta(counts: RoundCounts, config: GameConfig): number {
  return (
    counts.correct * config.correctScore +
    counts.skip * config.skipScore +
    counts.foul * (config.foulScore ?? 0)
  );
}

/**
 * Apply a round delta to a running total. Totals may go negative unless
 * `allowNegativeTotals` is false, in which case they clamp at 0 (spec §4.2).
 */
export function applyDelta(score: number, delta: number, allowNegativeTotals: boolean): number {
  const next = score + delta;
  return allowNegativeTotals ? next : Math.max(0, next);
}
