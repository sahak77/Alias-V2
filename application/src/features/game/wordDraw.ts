/**
 * Word-draw engine (spec §4.3): draw without repeating while unused words
 * remain; once the pool is exhausted mid-game, recycle previously shown words
 * (excluding the one on screen) so play never stalls on a small pack.
 *
 * Pure given an injected `rng`, so draws are deterministic in tests.
 */

/** Random source in `[0, 1)`; defaults to `Math.random` in app code. */
export type Rng = () => number;

/** Fisher–Yates shuffle into a NEW array; does not mutate the input. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    // Indices are always in range here; the guard satisfies noUncheckedIndexedAccess.
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

export interface DrawResult {
  /** The next word id, or null when no words are available at all. */
  wordId: string | null;
  /** The remaining upcoming queue after the draw. */
  wordQueue: string[];
}

/**
 * Take the next word id off `wordQueue`. When the queue is empty, rebuild it by
 * shuffling the already-shown `usedWordIds` (minus `excludeId`, the word on
 * screen) — the spec's "reshuffle used words and continue" rule.
 */
export function drawNext(
  wordQueue: readonly string[],
  usedWordIds: readonly string[],
  excludeId: string | null,
  rng: Rng = Math.random,
): DrawResult {
  let queue: string[] = wordQueue.slice();
  if (queue.length === 0) {
    queue = shuffle(
      usedWordIds.filter((id) => id !== excludeId),
      rng,
    );
  }
  const wordId = queue[0];
  if (wordId === undefined) return { wordId: null, wordQueue: [] };
  return { wordId, wordQueue: queue.slice(1) };
}
