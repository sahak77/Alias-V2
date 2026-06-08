import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Language, LanguagesResponse } from '@alias/contracts';
import { Language as LanguageSchema } from '@alias/contracts';
import { DB } from '../../db/db.module';
import { language } from '../../db/schema';
import type * as schema from '../../db/schema';

/** Short TTL — the catalog changes rarely; only successful reads are cached. */
const CACHE_TTL_MS = 60_000;

/**
 * Serves the dynamic word-language catalog from Postgres (db-architecture.md §5.8):
 * enabled languages, ordered for the picker. Degrades to an EMPTY list if the DB read
 * fails — the client bundles the launch set and derives offline availability on-device,
 * so this endpoint never gates the picker. The empty fallback is not cached, so the
 * catalog returns the moment the DB recovers.
 */
@Injectable()
export class LanguagesService {
  private readonly log = new Logger(LanguagesService.name);
  private cache: { languages: Language[]; expiresAt: number } | null = null;

  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async getLanguages(): Promise<LanguagesResponse> {
    if (this.cache && this.cache.expiresAt > Date.now()) return { languages: this.cache.languages };
    try {
      const rows = await this.db
        .select()
        .from(language)
        .where(eq(language.enabled, true))
        .orderBy(language.sortOrder, language.code);

      // Re-validate each row against the wire contract — a malformed `code` (the DB
      // CHECK is a recent addition; older rows may predate it) is dropped, never served.
      const languages: Language[] = [];
      let dropped = 0;
      for (const row of rows) {
        const parsed = LanguageSchema.safeParse(toLanguage(row));
        if (parsed.success) languages.push(parsed.data);
        else dropped++;
      }
      if (dropped > 0) this.log.warn(`dropped ${dropped} language row(s) failing the contract (e.g. malformed code)`);

      this.cache = { languages, expiresAt: Date.now() + CACHE_TTL_MS };
      return { languages };
    } catch (err) {
      this.log.warn(`languages read failed — serving empty catalog: ${String(err)}`);
      return { languages: [] };
    }
  }
}

type LanguageRow = typeof language.$inferSelect;

/** DB row → wire shape (internal columns dropped; nulls become omitted optionals). */
function toLanguage(row: LanguageRow): Language {
  return {
    code: row.code,
    endonym: row.endonym,
    displayName: row.displayName,
    flag: row.flag ?? undefined,
    direction: row.direction,
    isLaunchLocale: row.isLaunchLocale,
    defaultPackId: row.defaultPackId ?? undefined,
  };
}
