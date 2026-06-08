import type { ContentPolicy, GenerationRequest, WordCard } from '@alias/contracts';
import { AppError } from '../../common/errors/app-error';
import { normalizeText, normalizeTheme } from '../../infra/normalize';

/**
 * Content gate (above the model): normalize -> per-locale blocklist -> output re-scan,
 * reading the OTA ContentPolicy. The normalizer (shared with the RN device gate) always
 * runs; a locale with no policy ⇒ empty blocklist ⇒ permissive.
 */
export function normalizeRequestTheme(request: GenerationRequest): string {
  return normalizeTheme(request.theme);
}

/** True if any blocklist term appears in the normalized, lowercased text. */
function hitsBlocklist(text: string, blocklist: readonly string[]): boolean {
  if (blocklist.length === 0) return false;
  const haystack = normalizeText(text).toLowerCase();
  if (!haystack) return false;
  return blocklist.some((term) => {
    const needle = normalizeText(term).toLowerCase();
    return needle.length > 0 && haystack.includes(needle);
  });
}

/** Reject a banned theme BEFORE generation. The message never echoes the theme. */
export function assertInputAllowed(theme: string, policy: ContentPolicy | null): void {
  if (policy && hitsBlocklist(theme, policy.blocklist)) {
    throw new AppError('CONTENT_REJECTED', 'That theme isn’t allowed. Try a different topic.');
  }
}

/** Re-scan generated cards: drop blocklisted or empty words, dedupe by normalized word. */
export function filterOutput(cards: WordCard[], policy: ContentPolicy | null): WordCard[] {
  const blocklist = policy?.blocklist ?? [];
  const seen = new Set<string>();
  const out: WordCard[] = [];
  for (const card of cards) {
    const key = normalizeText(card.w).toLowerCase();
    if (!key || seen.has(key)) continue;
    const fields = [card.w, card.d ?? '', ...(card.t ?? []), card.h ?? ''];
    if (blocklist.length > 0 && fields.some((f) => hitsBlocklist(f, blocklist))) continue;
    seen.add(key);
    out.push(card);
  }
  return out;
}
