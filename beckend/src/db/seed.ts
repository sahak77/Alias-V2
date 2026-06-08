/**
 * Seed script (`npm run db:seed`, executed by tsx) — db-architecture.md §9.
 * Idempotent (re-runnable): launch-locale `content_policy` rows, the `language`
 * catalog (the 5 reviewed launch locales), the first-party "official" publisher
 * account, and the official **starter** pack as a `published_pack` row. Pack word
 * blobs live in R2 (`r2_key`) and are seeded by the R2 path (deferred), so the
 * pack row here carries placeholder `content_hash`/`r2_key` for now.
 *
 * Needs `DATABASE_URL` + a running Postgres (`docker compose up -d`).
 */

import { eq } from 'drizzle-orm';
import { closeDb, getDb } from './client';
import { account, contentPolicy, language, publishedPack } from './schema';

/** The reviewed launch locales (en/es/fr/de/pt), all LTR. */
const LAUNCH = [
  { code: 'en', endonym: 'English', displayName: 'English', flag: '🇬🇧', sortOrder: 0 },
  { code: 'es', endonym: 'Español', displayName: 'Spanish', flag: '🇪🇸', sortOrder: 1 },
  { code: 'fr', endonym: 'Français', displayName: 'French', flag: '🇫🇷', sortOrder: 2 },
  { code: 'de', endonym: 'Deutsch', displayName: 'German', flag: '🇩🇪', sortOrder: 3 },
  { code: 'pt', endonym: 'Português', displayName: 'Portuguese', flag: '🇵🇹', sortOrder: 4 },
] as const;

/** Fixed id so re-seeding is a no-op (published_pack has no natural unique key). */
const STARTER_PACK_ID = '00000000-0000-0000-0000-0000000000a1';
const OFFICIAL_PUBLISHER_KEY = 'official';

async function seed(): Promise<void> {
  const db = getDb();

  // 1. Launch-locale content policies — empty blocklist (permissive); the gate's
  //    normalizer still runs. `isLatest` true; version 1.
  await db
    .insert(contentPolicy)
    .values(LAUNCH.map((l) => ({ locale: l.code, version: 1, blocklist: [], isLatest: true })))
    .onConflictDoNothing();

  // 2. The dynamic word-language catalog (the reviewed launch set).
  await db
    .insert(language)
    .values(
      LAUNCH.map((l) => ({
        code: l.code,
        endonym: l.endonym,
        displayName: l.displayName,
        flag: l.flag,
        direction: 'ltr' as const,
        isLaunchLocale: true,
        sortOrder: l.sortOrder,
      })),
    )
    .onConflictDoNothing();

  // 3. The first-party "official" publisher account (no auth identity yet —
  //    `authUserId` stays null until Better Auth lands).
  await db
    .insert(account)
    .values({ publisherKeyId: OFFICIAL_PUBLISHER_KEY, nickname: 'Alias', role: 'official' })
    .onConflictDoNothing();
  const official = (
    await db.select().from(account).where(eq(account.publisherKeyId, OFFICIAL_PUBLISHER_KEY)).limit(1)
  )[0];
  if (!official) throw new Error('[seed] official account missing after upsert');

  // 4. The official English **starter** pack (metadata only — words live in R2,
  //    seeded by the deferred R2 path). Listed so onboarding can offer it.
  await db
    .insert(publishedPack)
    .values({
      id: STARTER_PACK_ID,
      publisherAccountId: official.id,
      publisherKeyId: OFFICIAL_PUBLISHER_KEY,
      title: 'Starter',
      description: 'The bundled English starter pack.',
      locale: 'en',
      source: 'builtin',
      status: 'listed',
      contentHash: 'seed-starter-en', // placeholder until the R2 blob path lands
      wordsCount: 50,
      r2Key: 'packs/seed-starter-en.json.gz',
      schemaVersion: 1,
    })
    .onConflictDoNothing();

  // 5. Recommend the starter as English's default pack.
  await db.update(language).set({ defaultPackId: STARTER_PACK_ID }).where(eq(language.code, 'en'));

  console.log('[seed] ✓ content_policy + language catalog + official account + starter pack seeded.');
}

seed()
  .catch((err: unknown) => {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
