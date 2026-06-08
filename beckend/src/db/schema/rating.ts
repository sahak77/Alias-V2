/**
 * Per-device pack rating (db-architecture.md §5.3) — anonymous, stars only (no
 * free-text). `raterDeviceHash` is a per-pack HMAC (unlinkable across packs);
 * re-rating UPSERTs the row. Feeds `published_pack.rating_avg`/`rating_count`.
 */

import { sql } from 'drizzle-orm';
import { check, index, pgTable, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { publishedPack } from './published-pack';

export const rating = pgTable(
  'rating',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publishedPackId: uuid('published_pack_id')
      .notNull()
      .references(() => publishedPack.id),
    raterDeviceHash: text('rater_device_hash').notNull(),
    stars: smallint('stars').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    deviceUq: unique('rating_pack_device_uq').on(t.publishedPackId, t.raterDeviceHash), // one per device per pack
    starsChk: check('rating_stars_chk', sql`${t.stars} between 1 and 5`),
    packIdx: index('rating_pack_idx').on(t.publishedPackId),
  }),
);
