import { z } from 'zod';

/**
 * BCP-47 language tag. WORD languages are DYNAMIC — the backend serves the list of
 * available word languages, and new ones added server-side appear automatically.
 * So this is an OPEN string with light format validation, NOT a closed enum.
 */
export const LocaleSchema = z
  .string()
  .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, 'Expected a BCP-47 language tag (e.g. "en", "pt-BR")');
export type Locale = z.infer<typeof LocaleSchema>;

/**
 * The fully-reviewed launch set for the bundled APP (UI) i18n strings. A convenience
 * constant only — it does NOT constrain word languages (served dynamically by the
 * backend) and is expandable.
 */
export const LAUNCH_LOCALES = ['en', 'es', 'fr', 'de', 'pt'] as const;
export type LaunchLocale = (typeof LAUNCH_LOCALES)[number];
