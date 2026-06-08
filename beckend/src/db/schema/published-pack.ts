/**
 * Published-pack metadata — one **mutable** row per pack (db-architecture.md §5.2).
 * Words live in R2 (`r2Key`), never here. Holds both community packs and the
 * first-party "official" standard packs. Editing words bumps `contentHash` +
 * `updatedAt` and re-enters moderation; `contentHash` is a plain index (integrity
 * + "update available" diff), **not** unique — blob dedupe happens at the R2 layer.
 */

import { sql } from 'drizzle-orm';
import { customType, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { account } from './account';
import { contentRating, packSource, publishStatus } from './enums';

/** Postgres `tsvector` (no native Drizzle type). */
const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

export const publishedPack = pgTable(
  'published_pack',
  {
    id: uuid('id').primaryKey().defaultRandom(), // the pack identity
    publisherAccountId: uuid('publisher_account_id').references(() => account.id, { onDelete: 'set null' }),
    publisherKeyId: text('publisher_key_id').notNull(), // denormalized durable handle (evidence anchor)
    title: text('title').notNull(),
    description: text('description'),
    coverEmoji: text('cover_emoji'),
    locale: text('locale').notNull(), // BCP-47; soft ref to language.code; drives search regconfig
    contentRating: contentRating('content_rating').notNull().default('standard'),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    source: packSource('source').notNull(),
    status: publishStatus('status').notNull().default('pending'), // fail-closed; edit resets to pending
    contentHash: text('content_hash').notNull(), // sha256; R2 key; changes on edit; NOT unique
    wordsCount: integer('words_count').notNull(),
    r2Key: text('r2_key').notNull(), // packs/{contentHash}.json.gz
    installCount: integer('install_count').notNull().default(0), // cache of install rows
    ratingAvg: numeric('rating_avg', { precision: 2, scale: 1 }).notNull().default('0'),
    ratingCount: integer('rating_count').notNull().default(0),
    reportCount: integer('report_count').notNull().default(0),
    aiMeta: jsonb('ai_meta'), // { themePromptHash, model, provider, generatedAt, properNounsAllowed }
    // Discover full-text. Per-locale `regconfig` + population belong to the Discover
    // write path (needs an IMMUTABLE wrapper for a generated column) — deferred with
    // Discover; the column + GIN index exist now so the model is stable.
    searchVector: tsvector('search_vector'),
    // No DB default — the writer (seed / publish path) stamps the current record
    // version so it can't go stale as the format evolves (db-architecture.md §5.2).
    schemaVersion: integer('schema_version').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    hashIdx: index('published_pack_hash_idx').on(t.contentHash),
    searchIdx: index('published_pack_search_idx').using('gin', t.searchVector),
    tagsIdx: index('published_pack_tags_idx').using('gin', t.tags),
    titleTrgmIdx: index('published_pack_title_trgm_idx').using('gin', sql`${t.title} gin_trgm_ops`),
    statusLocaleIdx: index('published_pack_status_locale_idx').on(t.status, t.locale),
    publisherIdx: index('published_pack_publisher_idx').on(t.publisherAccountId),
  }),
);
