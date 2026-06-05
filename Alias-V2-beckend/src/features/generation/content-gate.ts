import type { ContentPolicy, GenerationRequest, WordCard } from '@alias/contracts';
import { normalizeTheme } from '../../infra/normalize';

/**
 * Content gate (FIRM v2 once generation lands): normalize -> per-locale blocklist
 * -> strict-kids gate -> output re-scan, reading the OTA ContentPolicy. The
 * normalize step is real (shared with the RN device gate); the rest are seams.
 */
export function normalizeRequestTheme(request: GenerationRequest): string {
  return normalizeTheme(request.theme);
}

// TODO(generation): enforce per-locale blocklist + server-side kids adult-gate;
// throw AppError('CONTENT_REJECTED') on a violation.
export function assertInputAllowed(_theme: string, _policy: ContentPolicy | null): void {
  // Seam.
}

// TODO(generation): re-scan generated cards against the blocklist + taboo rules.
export function filterOutput(cards: WordCard[], _policy: ContentPolicy | null): WordCard[] {
  return cards;
}
