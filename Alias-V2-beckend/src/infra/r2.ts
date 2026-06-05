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
