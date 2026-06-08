/**
 * Install/download event (db-architecture.md §5.4) — anonymous; drives
 * `install_count`. `installDeviceHash` is a per-pack HMAC. One row per device per
 * pack ⇒ `install_count` is cumulative distinct devices, monotonic (never
 * decrements — uninstalls can't be detected offline).
 */

import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { publishedPack } from './published-pack';

export const install = pgTable(
  'install',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publishedPackId: uuid('published_pack_id')
      .notNull()
      .references(() => publishedPack.id),
    installDeviceHash: text('install_device_hash').notNull(),
    installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deviceUq: unique('install_pack_device_uq').on(t.publishedPackId, t.installDeviceHash),
    packIdx: index('install_pack_idx').on(t.publishedPackId),
  }),
);
