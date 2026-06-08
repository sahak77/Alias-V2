import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { ContentPolicy, LocaleSchema } from '@alias/contracts';
import { AppError } from '../../common/errors/app-error';
import { getPublicJson } from '../../infra/r2';

/** Short-TTL cache; the policy changes rarely and is patched out-of-band on R2. */
const CACHE_TTL_MS = 60_000;

/** The tiny mutable pointer at `policy/{locale}/latest.json` (backend-architecture.md §D5). */
const PointerSchema = z.object({ version: z.number().int().positive() });

/**
 * Reads the OTA content policy from R2/CDN (backend-architecture.md §D5,
 * db-architecture.md §5.7): resolve the `latest.json` pointer, then fetch the
 * immutable `v{N}.json`, validate it against the shared contract, and cache it.
 *
 * Degrades softly: an unconfigured base, an absent policy, or any fetch/parse
 * error yields an **empty (permissive) policy** — a locale may legitimately have
 * no policy, and the on-device + server gate's normalizer still runs. The endpoint
 * therefore never gates on the network.
 */
@Injectable()
export class ContentPolicyService {
  private readonly log = new Logger(ContentPolicyService.name);
  private readonly cache = new Map<string, { policy: ContentPolicy; expiresAt: number }>();

  async getPolicy(rawLocale: string): Promise<ContentPolicy> {
    // Validate the BCP-47 *format* (not availability — the catalog is dynamic).
    // This also keeps the value safe to interpolate into the R2 object key.
    const parsed = LocaleSchema.safeParse(rawLocale);
    if (!parsed.success) throw new AppError('VALIDATION', 'Invalid locale tag.');
    const locale = parsed.data;

    const cached = this.cache.get(locale);
    if (cached && cached.expiresAt > Date.now()) return cached.policy;

    const policy = await this.resolve(locale);
    this.cache.set(locale, { policy, expiresAt: Date.now() + CACHE_TTL_MS });
    return policy;
  }

  private async resolve(locale: string): Promise<ContentPolicy> {
    try {
      const pointer = PointerSchema.safeParse(await getPublicJson(`policy/${locale}/latest.json`));
      if (!pointer.success) return emptyPolicy(locale); // unconfigured / no policy ⇒ permissive

      const versioned = ContentPolicy.safeParse(await getPublicJson(`policy/${locale}/v${pointer.data.version}.json`));
      if (!versioned.success || versioned.data.locale !== locale) {
        this.log.warn(`content policy ${locale} v${pointer.data.version} missing/invalid — serving empty`);
        return emptyPolicy(locale);
      }
      return versioned.data;
    } catch (err) {
      // OTA delivery is never on the gameplay path — degrade to permissive.
      this.log.warn(`content policy ${locale} fetch failed — serving empty: ${String(err)}`);
      return emptyPolicy(locale);
    }
  }
}

/** A locale with no policy is permissive (empty blocklist); version 0 signals "none". */
function emptyPolicy(locale: string): ContentPolicy {
  return { locale, version: 0, blocklist: [] };
}
