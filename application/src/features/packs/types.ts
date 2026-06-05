/**
 * On-device pack types. The wire `Pack`/`Card` from `@alias/contracts` are the
 * serialization boundary; these are the gameplay-ready shapes the screens
 * render. The key difference: a {@link GameWordCard} carries a stable local
 * `id` (the slim wire `Card` has none) — assigned at pack-load.
 */

export interface GameWordCard {
  /** Stable local id, `${packId}:${index}` — used by the engine's word queue. */
  id: string;
  packId: string;
  /** BCP-47 language inherited from the owning pack. */
  locale: string;
  word: string;
  /** Forbidden related words (Taboo mode, v2). */
  taboo?: string[];
  /** Optional gameplay hint (future AI/hint modes). */
  hint?: string;
}
