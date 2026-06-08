/**
 * Dynamic word-language catalog (db-architecture.md §5.8) — backs the deferred
 * `GET /v1/languages` and the app's first-run + change-language pickers. New
 * languages added here appear automatically; the client never hardcodes word
 * languages. `direction` is server-driven so an RTL language ships without an
 * app update.
 */

import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { textDirection } from './enums';
import { publishedPack } from './published-pack';

export const language = pgTable(
  'language',
  {
    code: text('code').primaryKey(), // BCP-47 (en, pt-BR, …)
    endonym: text('endonym').notNull(), // native name
    displayName: text('display_name').notNull(),
    flag: text('flag'),
    direction: textDirection('direction').notNull().default('ltr'),
    isLaunchLocale: boolean('is_launch_locale').notNull().default(false), // en/es/fr/de/pt
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    // Recommended starter pack to auto-select/download for this language; nullable
    // until one exists. (Overall offline availability is derived from published_pack.)
    defaultPackId: uuid('default_pack_id').references(() => publishedPack.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Enforce BCP-47 at the write boundary (mirrors the contract LocaleSchema regex) so
    // a future admin/publish path can't store a malformed code the client would reject.
    codeFormat: check('language_code_format', sql`${t.code} ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'`),
  }),
);
