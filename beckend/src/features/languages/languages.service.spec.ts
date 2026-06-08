import { Logger } from '@nestjs/common';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { LanguagesService } from './languages.service';
import * as schema from '../../db/schema';

// Minimal slice of the `language` table (db-architecture.md §5.8) — the read path only
// touches this table, so we create it directly in PGlite rather than apply the full
// migration (which carries pg_trgm / tsvector the catalog query never needs).
const DDL = `
CREATE TYPE text_direction AS ENUM ('ltr', 'rtl');
CREATE TABLE language (
  code text PRIMARY KEY,
  endonym text NOT NULL,
  display_name text NOT NULL,
  flag text,
  direction text_direction NOT NULL DEFAULT 'ltr',
  is_launch_locale boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  default_pack_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO language (code, endonym, display_name, flag, direction, is_launch_locale, enabled, sort_order, default_pack_id) VALUES
  ('es', 'Español', 'Spanish', '🇪🇸', 'ltr', true, true, 1, NULL),
  ('en', 'English', 'English', '🇬🇧', 'ltr', true, true, 0, '00000000-0000-0000-0000-0000000000a1'),
  ('ar', 'العربية', 'Arabic', NULL, 'rtl', false, true, 2, NULL),
  ('zz', 'Disabled', 'Disabled', NULL, 'ltr', false, false, 3, NULL),
  ('pt_BR', 'Inválido', 'Malformed', NULL, 'ltr', false, true, 5, NULL);
`;
// Note: 'pt_BR' (underscore) violates the contract's BCP-47 regex. The real schema now
// CHECK-constrains this at write time; the test DDL omits the constraint so we can
// insert a bad row and verify the read boundary drops it.

describe('LanguagesService (PGlite-backed read)', () => {
  let pg: PGlite;
  let service: LanguagesService;

  beforeAll(async () => {
    pg = new PGlite();
    await pg.exec(DDL);
    const db = drizzle(pg, { schema }) as unknown as NodePgDatabase<typeof schema>;
    service = new LanguagesService(db);
  });
  afterAll(async () => {
    await pg.close();
  });

  it('returns only ENABLED languages, ordered by sortOrder then code, dropping malformed codes', async () => {
    const { languages } = await service.getLanguages();
    // 'zz' disabled → excluded by the query; 'pt_BR' malformed → dropped by the contract re-validate.
    expect(languages.map((l) => l.code)).toEqual(['en', 'es', 'ar']);
  });

  it('maps rows to the wire shape — nulls become omitted optionals, RTL preserved', async () => {
    const { languages } = await service.getLanguages();
    expect(languages.find((l) => l.code === 'en')).toEqual({
      code: 'en',
      endonym: 'English',
      displayName: 'English',
      flag: '🇬🇧',
      direction: 'ltr',
      isLaunchLocale: true,
      defaultPackId: '00000000-0000-0000-0000-0000000000a1',
    });
    const ar = languages.find((l) => l.code === 'ar');
    expect(ar?.direction).toBe('rtl');
    expect(ar?.flag).toBeUndefined();
    expect(ar?.defaultPackId).toBeUndefined();
  });
});

describe('LanguagesService (degraded)', () => {
  it('serves an empty catalog when the DB read throws', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const failingDb = {
      select: () => ({ from: () => ({ where: () => ({ orderBy: () => Promise.reject(new Error('db down')) }) }) }),
    } as unknown as NodePgDatabase<typeof schema>;

    await expect(new LanguagesService(failingDb).getLanguages()).resolves.toEqual({ languages: [] });
  });
});
