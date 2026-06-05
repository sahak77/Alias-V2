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
