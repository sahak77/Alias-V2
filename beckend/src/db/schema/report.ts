/**
 * In-app abuse report (db-architecture.md §5.5) — an anonymous triage signal that
 * feeds the moderation queue (NOT the formal DMCA channel). `reporterDeviceHash`
 * is a salted per-pack HMAC (cross-pack-unlinkable). Crossing a `report_count`
 * threshold auto-flips a pack to `held`. `details` is moderator-only.
 */

import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { reportReason, reportStatus } from './enums';
import { publishedPack } from './published-pack';

export const report = pgTable(
  'report',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publishedPackId: uuid('published_pack_id')
      .notNull()
      .references(() => publishedPack.id),
    reasonCode: reportReason('reason_code').notNull(),
    reporterDeviceHash: text('reporter_device_hash').notNull(),
    details: text('details'), // optional free text; moderator-only — never shown publicly
    status: reportStatus('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deviceUq: unique('report_pack_device_uq').on(t.publishedPackId, t.reporterDeviceHash),
    statusIdx: index('report_status_idx').on(t.status),
  }),
);
