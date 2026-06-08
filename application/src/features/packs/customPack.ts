/**
 * Pure helpers for the Pack Editor (create a custom pack by hand). The editor screen
 * (`app/pack-editor.tsx`) is thin glue; this is the testable logic that turns free-text
 * editor input into a wire {@link Pack}. Words are entered one-per-line (bulk-paste is
 * free); commas also separate so a pasted "a, b, c" list works.
 */

import { type Pack } from '@alias/contracts';

/** The word language for a hand-made pack is picked from the bundled launch set. */
export const CUSTOM_PACK_SCHEMA_VERSION = 1;

/** Split free text into clean, de-duplicated words (first occurrence wins, case-insensitive). */
export function parseWordList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,]/)) {
    const word = raw.trim();
    if (!word) continue;
    const key = word.normalize('NFKC').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

export interface CustomPackDraft {
  id: string;
  title: string;
  locale: string;
  /** Raw editor text — one word per line (commas also separate). */
  wordsText: string;
}

/** Build a wire Pack from editor input, or `null` when it has no title or no words. */
export function buildCustomPack(draft: CustomPackDraft): Pack | null {
  const title = draft.title.trim();
  const words = parseWordList(draft.wordsText);
  if (!title || words.length === 0) return null;
  return {
    id: draft.id,
    title,
    locale: draft.locale,
    schemaVersion: CUSTOM_PACK_SCHEMA_VERSION,
    cards: words.map((w) => ({ w })),
  };
}

/** Stable local id for a NEW custom pack. `now` is injected (no clock inside) for testability. */
export function newCustomPackId(now: number): string {
  return `custom.${now.toString(36)}`;
}
