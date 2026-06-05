import { z } from 'zod';
import { LocaleSchema } from './locale';

/**
 * OTA content policy served per locale from R2 + CDN. Drives the on-device and
 * server content gate; patchable without an app-store release.
 */
export const ContentPolicy = z.object({
  locale: LocaleSchema,
  version: z.number().int(),
  blocklist: z.array(z.string()),
});
export type ContentPolicy = z.infer<typeof ContentPolicy>;
