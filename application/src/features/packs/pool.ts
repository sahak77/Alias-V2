/**
 * Pack → word-pool adapter. Maps the slim wire `Pack`/`Card` shapes into local
 * {@link GameWordCard}s (assigning stable ids), and merges any number of packs
 * into a single deduped pool — the combined multi-pack pool of spec §12. The
 * engine's `createSession` consumes `wordIds`; the screens render via `cardsById`.
 */

import { type Card, type Pack } from '@alias/contracts';
import type { GameWordCard } from './types';

/** Stable local id for a card within a pack (the wire `Card` has no id). */
export function cardId(packId: string, index: number): string {
  return `${packId}:${index}`;
}

/**
 * Normalize a word for cross-pack dedupe (NFKC + trim + lowercase). This is the
 * lightweight dedupe normalizer only; the stricter content-gate normalizer
 * (zero-width/bidi stripping) arrives with backend integration.
 */
export function normalizeWord(word: string): string {
  return word.normalize('NFKC').trim().toLowerCase();
}

function fromWireCard(pack: Pack, card: Card, index: number): GameWordCard {
  return {
    id: cardId(pack.id, index),
    packId: pack.id,
    locale: pack.locale,
    word: card.w,
    ...(card.t !== undefined ? { taboo: card.t } : {}),
    ...(card.h !== undefined ? { hint: card.h } : {}),
  };
}

/** Map one pack's wire cards into local render cards with stable ids. */
export function toGameCards(pack: Pack): GameWordCard[] {
  return pack.cards.map((card, index) => fromWireCard(pack, card, index));
}

export interface WordPool {
  /** All cards in pool order, after cross-pack dedupe. */
  cards: GameWordCard[];
  /** Lookup by card id for O(1) render of the current word. */
  cardsById: Map<string, GameWordCard>;
  /** Ordered ids handed to the engine's `createSession({ poolWordIds })`. */
  wordIds: string[];
}

/**
 * Merge packs into one pool, deduping words that are identical within a locale
 * (first occurrence wins). Ids stay globally unique because they embed the
 * source pack id.
 */
export function buildWordPool(packs: readonly Pack[]): WordPool {
  const cards: GameWordCard[] = [];
  const seen = new Set<string>();
  for (const pack of packs) {
    pack.cards.forEach((card, index) => {
      const key = `${pack.locale}::${normalizeWord(card.w)}`;
      if (seen.has(key)) return;
      seen.add(key);
      cards.push(fromWireCard(pack, card, index));
    });
  }
  return {
    cards,
    cardsById: new Map(cards.map((card) => [card.id, card])),
    wordIds: cards.map((card) => card.id),
  };
}
