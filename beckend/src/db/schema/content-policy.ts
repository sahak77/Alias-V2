/**
 * OTA content-policy source of truth (db-architecture.md §5.7) — the per-locale
 * blocklist, published to R2 and read by the server content gate. Append-only
 * versions: a published `v{N}` is immutable; a new policy is a new row + an
 * `isLatest` flip. The wire shape is exactly `@alias/contracts` `ContentPolicy`
 * (locale, version, blocklist); `id`/`isLatest`/`createdAt` are server bookkeeping.
 */

import { sql } from 'drizzle-orm';
import { boolean, integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const contentPolicy = pgTable(
  'content_policy',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    locale: text('locale').notNull(), // BCP-47
    version: integer('version').notNull(),
    blocklist: text('blocklist').array().notNull().default(sql`'{}'::text[]`),
    isLatest: boolean('is_latest').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    localeVersionUq: unique('content_policy_locale_version_uq').on(t.locale, t.version),
    // Exactly one latest per locale.
    latestUq: uniqueIndex('content_policy_latest_uq').on(t.locale).where(sql`${t.isLatest}`),
  }),
);
