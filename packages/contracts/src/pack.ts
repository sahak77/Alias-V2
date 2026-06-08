import { z } from 'zod';
import { LocaleSchema } from './locale';

/** Slim on-the-wire card shape (word / description / taboo terms). */
export const Card = z.object({
  w: z.string(),
  d: z.string().optional(),
  t: z.array(z.string()).optional(),
  h: z.string().optional(), // hint — optional gameplay hint for future AI/hint modes
});
export type Card = z.infer<typeof Card>;

/** Pack metadata + cards. Persisted shapes carry a schemaVersion migration ladder. */
export const Pack = z.object({
  id: z.string(),
  title: z.string(),
  locale: LocaleSchema,
  schemaVersion: z.number().int(),
  cards: z.array(Card),
});
export type Pack = z.infer<typeof Pack>;

/** Server-side pack provenance (matches the published_pack `source` enum). */
export const PackSource = z.enum(['builtin', 'custom', 'ai']);
export type PackSource = z.infer<typeof PackSource>;

/** Pack content rating (matches the published_pack `content_rating` enum). `adult` = 18+. */
export const ContentRating = z.enum(['standard', 'adult']);
export type ContentRating = z.infer<typeof ContentRating>;

/**
 * Lightweight catalog entry for `GET /v1/packs` (v1 onboarding: first-party OFFICIAL
 * packs only — no community ratings/installs). The word blob is NOT included: the
 * client downloads it directly from `downloadUrl` (the public R2/CDN object) and
 * verifies `contentHash`, keeping the backend off the data path. `downloadUrl` is
 * absent when object storage is unconfigured.
 */
export const PackSummary = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  coverEmoji: z.string().optional(),
  locale: LocaleSchema,
  contentRating: ContentRating,
  tags: z.array(z.string()),
  source: PackSource,
  wordsCount: z.number().int(),
  contentHash: z.string(),
  schemaVersion: z.number().int(),
  downloadUrl: z.string().optional(),
});
export type PackSummary = z.infer<typeof PackSummary>;

/** Response for `GET /v1/packs` — an envelope so pagination/metadata can be added later. */
export const PacksResponse = z.object({
  packs: z.array(PackSummary),
});
export type PacksResponse = z.infer<typeof PacksResponse>;
