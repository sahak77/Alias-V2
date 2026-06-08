import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PackSummary, PacksResponse } from '@alias/contracts';
import { PackSummary as PackSummarySchema, LocaleSchema } from '@alias/contracts';
import { AppError } from '../../common/errors/app-error';
import { DB } from '../../db/db.module';
import { publishedPack } from '../../db/schema';
import type * as schema from '../../db/schema';
import { r2PublicUrl } from '../../infra/r2';

/** Short TTL — the official catalog changes rarely; only successful reads are cached. */
const CACHE_TTL_MS = 60_000;

/**
 * Serves the first-party OFFICIAL pack catalog (`GET /v1/packs`) for v1 onboarding:
 * `status='listed' AND source='builtin'` packs from `published_pack`, optionally
 * filtered by word language. Word blobs are NOT served here — each summary carries a
 * public-CDN `downloadUrl` the client fetches DIRECTLY (backend off the data path,
 * per backend-architecture.md §D5). Degrades to an empty catalog if the DB read fails;
 * the client always has the bundled starter pack offline. The community write side
 * (publish / Discover / ratings / install tracking) stays a deferred seam.
 */
@Injectable()
export class PacksService {
  private readonly log = new Logger(PacksService.name);
  private readonly cache = new Map<string, { packs: PackSummary[]; expiresAt: number }>();

  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async listPacks(rawLocale?: string): Promise<PacksResponse> {
    let locale: string | undefined;
    if (rawLocale !== undefined) {
      // A malformed optional filter is a 422 (not a soft-degrade): legitimate clients
      // only send codes from GET /v1/languages — DB-CHECK-constrained to this same
      // BCP-47 regex — so this path is unreachable in real onboarding and only flags a
      // buggy client. It does NOT gate gameplay (the client falls back to the bundled
      // starter on any non-200); a clear 422 beats a silent empty "no packs" list.
      const parsed = LocaleSchema.safeParse(rawLocale);
      if (!parsed.success) throw new AppError('VALIDATION', 'Invalid locale tag.');
      locale = parsed.data;
    }

    const cacheKey = locale ?? '*';
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return { packs: cached.packs };

    try {
      // First-party official packs only (community packs are 'custom'/'ai' — deferred).
      const conditions: SQL[] = [eq(publishedPack.status, 'listed'), eq(publishedPack.source, 'builtin')];
      if (locale) conditions.push(eq(publishedPack.locale, locale));

      const rows = await this.db
        .select({
          id: publishedPack.id,
          title: publishedPack.title,
          description: publishedPack.description,
          coverEmoji: publishedPack.coverEmoji,
          locale: publishedPack.locale,
          contentRating: publishedPack.contentRating,
          tags: publishedPack.tags,
          source: publishedPack.source,
          wordsCount: publishedPack.wordsCount,
          contentHash: publishedPack.contentHash,
          r2Key: publishedPack.r2Key,
          schemaVersion: publishedPack.schemaVersion,
        })
        .from(publishedPack)
        .where(and(...conditions))
        .orderBy(publishedPack.locale, publishedPack.title);

      // Re-validate each row against the wire contract; drop anything malformed.
      const packs: PackSummary[] = [];
      let dropped = 0;
      for (const row of rows) {
        const parsed = PackSummarySchema.safeParse(toSummary(row));
        if (parsed.success) packs.push(parsed.data);
        else dropped++;
      }
      if (dropped > 0) this.log.warn(`dropped ${dropped} pack row(s) failing the contract`);

      this.cache.set(cacheKey, { packs, expiresAt: Date.now() + CACHE_TTL_MS });
      return { packs };
    } catch (err) {
      if (err instanceof AppError) throw err; // VALIDATION etc. are not DB failures
      this.log.warn(`packs read failed — serving empty catalog: ${String(err)}`);
      return { packs: [] };
    }
  }
}

interface PackRow {
  id: string;
  title: string;
  description: string | null;
  coverEmoji: string | null;
  locale: string;
  contentRating: 'standard' | 'adult';
  tags: string[];
  source: 'builtin' | 'custom' | 'ai';
  wordsCount: number;
  contentHash: string;
  r2Key: string;
  schemaVersion: number;
}

/** DB row → wire summary; the client downloads the blob from the public CDN url. */
function toSummary(row: PackRow): PackSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    coverEmoji: row.coverEmoji ?? undefined,
    locale: row.locale,
    contentRating: row.contentRating,
    tags: row.tags,
    source: row.source,
    wordsCount: row.wordsCount,
    contentHash: row.contentHash,
    schemaVersion: row.schemaVersion,
    downloadUrl: r2PublicUrl(row.r2Key) ?? undefined,
  };
}
