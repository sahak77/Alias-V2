/**
 * Append-only verdict & takedown-evidence log (db-architecture.md §5.6) — no
 * UPDATE/DELETE in prod (revoke those grants). The latest row per pack is the
 * current verdict. Retains `publisherKeyId` + `contentHash` so repeat-infringer
 * history survives account deletion; `contentHash` is also the "approved hash"
 * for re-moderate-on-edit (live-hash drift ⇒ treated as unreviewed).
 */

import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { account } from './account';
import { moderationActor, moderationDecision } from './enums';
import { publishedPack } from './published-pack';

export const moderationVerdict = pgTable(
  'moderation_verdict',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publishedPackId: uuid('published_pack_id')
      .notNull()
      .references(() => publishedPack.id),
    verdict: moderationDecision('verdict').notNull(),
    classifierFlags: jsonb('classifier_flags').notNull().default(sql`'[]'::jsonb`), // [{ classifier, label, score }]
    ipFlags: text('ip_flags').array().notNull().default(sql`'{}'::text[]`), // IP-rights matches (the primary IP signal)
    decidedBy: moderationActor('decided_by').notNull(),
    reviewerId: uuid('reviewer_id').references(() => account.id), // admin who decided (human only)
    notes: text('notes'),
    contentHash: text('content_hash').notNull(), // exact content reviewed — evidence + approved-hash
    publisherKeyId: text('publisher_key_id').notNull(), // durable, non-PII; repeat-infringer linkage
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    publisherIdx: index('moderation_verdict_publisher_idx').on(t.publisherKeyId),
    packCreatedIdx: index('moderation_verdict_pack_created_idx').on(t.publishedPackId, t.createdAt.desc()), // latest per pack
  }),
);
