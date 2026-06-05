/**
 * Drizzle schema barrel — INTENTIONALLY EMPTY this pass (tooling provisioned, no
 * tables yet, per the agreed scope). Until a `pgTable` is added here,
 * `npm run db:generate` produces no migrations.
 *
 * Next pass adds the full v2 schema here:
 *   account, published_pack, rating, install, report, moderation_verdict,
 *   content_policy
 * with UNIQUE(publishedPackId, version) + UNIQUE(contentHash), JSONB moderation
 * verdicts, text[] blocklists, and per-locale generated tsvector + pg_trgm for
 * Discover. Better Auth owns its own auth tables; keep `account` linkable to them.
 */
export {};
