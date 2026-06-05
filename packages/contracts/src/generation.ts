import { z } from 'zod';
import { LocaleSchema } from './locale';

/** AI word-pack generation modes. */
export const GenerationMode = z.enum(['create', 'expand', 'replaceWord']);
export type GenerationMode = z.infer<typeof GenerationMode>;

/** Content filter tier. `adult` = 18+ content; `standard` is the default. (Enforcement deferred.) */
export const ContentFilter = z.enum(['standard', 'adult']);
export type ContentFilter = z.infer<typeof ContentFilter>;

/**
 * Request body for `POST /v1/generate`. The server RE-VALIDATES this and treats
 * `theme` as untrusted data: length cap, normalize (bidi/zero-width/control-char
 * strip), and pass it as a delimited DATA block — never concatenated into prompt
 * instructions. The server also re-caps `count` regardless of the client value.
 */
export const GenerationRequest = z.object({
  theme: z.string().min(1).max(200),
  count: z.number().int().min(1).max(50).default(25),
  locale: LocaleSchema,
  mode: GenerationMode.default('create'),
  withTaboo: z.boolean().default(false),
  contentFilter: ContentFilter.default('standard'),
});
export type GenerationRequest = z.infer<typeof GenerationRequest>;

/** A single generated card: word, optional description, optional taboo terms. */
export const WordCard = z.object({
  w: z.string(),
  d: z.string().optional(),
  t: z.array(z.string()).optional(),
  h: z.string().optional(), // hint — optional gameplay hint for future AI/hint modes
});
export type WordCard = z.infer<typeof WordCard>;

/** Backstage metadata about an AI generation (model, prompt version, timestamp). */
export const AiMeta = z.object({
  model: z.string(),
  promptVersion: z.string(),
  generatedAt: z.string(),
});
export type AiMeta = z.infer<typeof AiMeta>;

/** Successful generation response: a validated chunk of cards + metadata. */
export const GenerationResponse = z.object({
  ok: z.literal(true),
  cards: z.array(WordCard),
  meta: AiMeta,
});
export type GenerationResponse = z.infer<typeof GenerationResponse>;
