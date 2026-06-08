/** Postgres enums shared across the schema (db-architecture.md §4). */

import { pgEnum } from 'drizzle-orm/pg-core';

export const accountStatus = pgEnum('account_status', ['active', 'suspended', 'deleted']);
export const accountRole = pgEnum('account_role', ['user', 'official', 'admin']);
export const contentRating = pgEnum('content_rating', ['standard', 'adult']); // 'adult' = 18+ (kids removed)
export const packSource = pgEnum('pack_source', ['builtin', 'custom', 'ai']); // server origin only
export const publishStatus = pgEnum('publish_status', ['pending', 'listed', 'held', 'takenDown']);
export const moderationDecision = pgEnum('moderation_decision', ['approved', 'held', 'rejected']);
export const moderationActor = pgEnum('moderation_actor', ['auto', 'human']);
export const reportReason = pgEnum('report_reason', ['ip', 'adult', 'spam', 'quality', 'other']);
export const reportStatus = pgEnum('report_status', ['open', 'reviewing', 'actioned', 'dismissed']);
export const textDirection = pgEnum('text_direction', ['ltr', 'rtl']);
