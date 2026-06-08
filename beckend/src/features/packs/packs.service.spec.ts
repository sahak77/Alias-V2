import { Logger } from '@nestjs/common';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PacksService } from './packs.service';
import * as schema from '../../db/schema';

// Minimal slice of published_pack — the read projects only catalog-summary columns,
// so we create just those (avoids the tsvector / numeric / FK machinery the read never
// touches). Rows exercise the official filter, locale filter, and contract drop.
const DDL = `
CREATE TYPE content_rating AS ENUM ('standard', 'adult');
CREATE TYPE pack_source AS ENUM ('builtin', 'custom', 'ai');
CREATE TYPE publish_status AS ENUM ('pending', 'listed', 'held', 'takenDown');
CREATE TABLE published_pack (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text,
  cover_emoji text,
  locale text NOT NULL,
  content_rating content_rating NOT NULL DEFAULT 'standard',
  tags text[] NOT NULL DEFAULT '{}',
  source pack_source NOT NULL,
  status publish_status NOT NULL DEFAULT 'pending',
  content_hash text NOT NULL,
  words_count integer NOT NULL,
  r2_key text NOT NULL,
  schema_version integer NOT NULL
);
INSERT INTO published_pack (id, title, description, cover_emoji, locale, content_rating, tags, source, status, content_hash, words_count, r2_key, schema_version) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Starter', 'English starter', '🇬🇧', 'en', 'standard', '{starter}', 'builtin', 'listed', 'hash-en', 50, 'packs/hash-en.json.gz', 1),
  ('00000000-0000-0000-0000-0000000000a2', 'Iniciador', NULL, NULL, 'es', 'standard', '{}', 'builtin', 'listed', 'hash-es', 40, 'packs/hash-es.json.gz', 1),
  ('00000000-0000-0000-0000-0000000000b1', 'Pending', NULL, NULL, 'en', 'standard', '{}', 'builtin', 'pending', 'hash-pending', 10, 'packs/hash-pending.json.gz', 1),
  ('00000000-0000-0000-0000-0000000000c1', 'Community', NULL, NULL, 'en', 'standard', '{}', 'custom', 'listed', 'hash-comm', 30, 'packs/hash-comm.json.gz', 1),
  ('00000000-0000-0000-0000-0000000000d1', 'Bad Locale', NULL, NULL, 'en_US_bad', 'standard', '{}', 'builtin', 'listed', 'hash-bad', 5, 'packs/hash-bad.json.gz', 1);
`;

describe('PacksService (PGlite-backed read)', () => {
  let pg: PGlite;
  let service: PacksService;
  let prevR2: string | undefined;

  beforeAll(async () => {
    prevR2 = process.env.R2_PUBLIC_BASE_URL;
    process.env.R2_PUBLIC_BASE_URL = 'https://cdn.test';
    pg = new PGlite();
    await pg.exec(DDL);
    const db = drizzle(pg, { schema }) as unknown as NodePgDatabase<typeof schema>;
    service = new PacksService(db);
  });
  afterAll(async () => {
    if (prevR2 === undefined) delete process.env.R2_PUBLIC_BASE_URL;
    else process.env.R2_PUBLIC_BASE_URL = prevR2;
    await pg.close();
  });

  it('lists only LISTED + BUILTIN (official) packs, ordered by locale then title, dropping malformed rows', async () => {
    const { packs } = await service.listPacks();
    // Excludes 'pending' (b1) + 'custom' (c1); drops 'en_US_bad' (d1) at the contract boundary.
    expect(packs.map((p) => p.id)).toEqual([
      '00000000-0000-0000-0000-0000000000a1',
      '00000000-0000-0000-0000-0000000000a2',
    ]);
  });

  it('maps the wire summary + builds a public CDN downloadUrl from r2Key', async () => {
    const { packs } = await service.listPacks();
    const en = packs.find((p) => p.id === '00000000-0000-0000-0000-0000000000a1');
    expect(en).toEqual({
      id: '00000000-0000-0000-0000-0000000000a1',
      title: 'Starter',
      description: 'English starter',
      coverEmoji: '🇬🇧',
      locale: 'en',
      contentRating: 'standard',
      tags: ['starter'],
      source: 'builtin',
      wordsCount: 50,
      contentHash: 'hash-en',
      schemaVersion: 1,
      downloadUrl: 'https://cdn.test/packs/hash-en.json.gz',
    });
  });

  it('filters by word language when a locale is given', async () => {
    const { packs } = await service.listPacks('es');
    expect(packs.map((p) => p.id)).toEqual(['00000000-0000-0000-0000-0000000000a2']);
  });

  it('rejects a malformed locale query with VALIDATION (never reaches the DB)', async () => {
    await expect(service.listPacks('x')).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('PacksService (degraded)', () => {
  it('serves an empty catalog when the DB read throws', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const failingDb = {
      select: () => ({ from: () => ({ where: () => ({ orderBy: () => Promise.reject(new Error('db down')) }) }) }),
    } as unknown as NodePgDatabase<typeof schema>;

    await expect(new PacksService(failingDb).listPacks()).resolves.toEqual({ packs: [] });
  });
});
