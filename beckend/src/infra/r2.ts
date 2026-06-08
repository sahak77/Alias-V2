import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 (S3-compatible) — content-addressed pack blobs + OTA ContentPolicy
 * JSON. LAZY + env-gated: returns null when unconfigured so the app boots with no
 * network.
 */
let client: S3Client | null = null;

export function getR2(): S3Client | null {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

/**
 * Read + parse a JSON object from the **public** R2/CDN base (`R2_PUBLIC_BASE_URL`).
 * The OTA ContentPolicy is public + CDN-cached, so reads need no credentials — a
 * plain fetch. Returns `null` when the base is unconfigured (offline-safe boot) or
 * the object is absent (404); other HTTP errors throw so the caller can degrade.
 */
export async function getPublicJson(path: string): Promise<unknown | null> {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return null;
  const res = await fetch(`${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 public GET ${path} failed: ${res.status}`);
  return (await res.json()) as unknown;
}

/**
 * Public CDN URL for an R2 object key (e.g. a content-addressed pack blob
 * `packs/{contentHash}.json.gz`), or `null` when object storage is unconfigured.
 * Clients fetch pack blobs from this URL DIRECTLY — the backend stays off the data path.
 */
export function r2PublicUrl(key: string): string | null {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
}
