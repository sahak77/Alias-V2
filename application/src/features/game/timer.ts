/**
 * Round-timer math (spec §8). The round length is driven by a single absolute
 * `roundEndTimestamp` (epoch ms), never by accumulated intervals — this is what
 * prevents drift, double-counting, and the "two timers running" class of bugs.
 * A single UI ticker calls {@link remainingSec} each second.
 */

/** Absolute epoch-ms at which a round started now should end. */
export function roundEndTimestamp(now: number, durationSec: number): number {
  return now + durationSec * 1000;
}

/** Milliseconds left until `endTimestamp`, clamped at 0. */
export function remainingMs(endTimestamp: number, now: number): number {
  return Math.max(0, endTimestamp - now);
}

/** Whole seconds remaining, rounded up so a fresh N-second round reads "N". */
export function remainingSec(endTimestamp: number, now: number): number {
  return Math.ceil(remainingMs(endTimestamp, now) / 1000);
}

export function isExpired(endTimestamp: number, now: number): boolean {
  return now >= endTimestamp;
}

/**
 * Re-anchor the end timestamp on resume from a pause: given the ms that were
 * remaining when the round was backgrounded, compute a fresh end timestamp.
 * The clock never advances while paused (spec §8 backgrounding).
 */
export function resumeEndTimestamp(now: number, pausedRemainingMs: number): number {
  return now + Math.max(0, pausedRemainingMs);
}
