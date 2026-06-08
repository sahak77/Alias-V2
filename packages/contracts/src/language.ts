import { z } from 'zod';
import { LocaleSchema } from './locale';

/** Text direction for a word language — server-driven so an RTL language ships without an app update. */
export const TextDirection = z.enum(['ltr', 'rtl']);
export type TextDirection = z.infer<typeof TextDirection>;

/**
 * One entry in the DYNAMIC word-language catalog served by `GET /v1/languages`. The
 * client never hardcodes word languages; new ones added server-side appear here. The
 * app's offline availability is derived on-device (from downloaded packs), not here —
 * the catalog only points at the recommended `defaultPackId` to download.
 */
export const Language = z.object({
  code: LocaleSchema, // BCP-47 (en, pt-BR, …)
  endonym: z.string(), // native name, e.g. "Español"
  displayName: z.string(), // English name, e.g. "Spanish"
  flag: z.string().optional(),
  direction: TextDirection,
  isLaunchLocale: z.boolean(),
  defaultPackId: z.string().optional(), // recommended starter pack to auto-select/download
});
export type Language = z.infer<typeof Language>;

/** Response for `GET /v1/languages` — an envelope so catalog metadata can be added later. */
export const LanguagesResponse = z.object({
  languages: z.array(Language),
});
export type LanguagesResponse = z.infer<typeof LanguagesResponse>;
