import { Redis } from '@upstash/redis';

/**
 * Upstash Redis (HTTP) — holds the spend-cap reservation + rate-limit counters.
 * LAZY + env-gated: returns null when unconfigured so the app boots with no network.
 * The hard-reservation Lua (admission control) lives here when the proxy is wired.
 */
let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  client = new Redis({ url, token });
  return client;
}
