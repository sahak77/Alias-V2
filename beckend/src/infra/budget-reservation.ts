import type { ConfigService } from '@nestjs/config';
import type { Redis } from '@upstash/redis';
import type { Env } from '../config/env';
import type { BudgetReservation, ReservationResult } from '../common/guards/budget.guard';
import { getRedis } from './redis';

/**
 * Spend-cap admission control (backend-architecture.md §D4). The reservation reserves
 * projected-max tokens BEFORE the provider call against three tiers and refunds the
 * delta after — it is NOT a post-hoc counter. The atomic check-and-increment is a
 * single Lua EVAL so concurrent requests can't race past the ceiling.
 */

const DAY_TTL_SECONDS = 172_800; // 2 days — daily buckets self-heal
const MONTH_TTL_SECONDS = 2_764_800; // 32 days — monthly global bucket

// Atomically: read all three tiers; reject (return the binding tier name) if adding
// the projection would breach any limit; otherwise reserve on all three + set TTLs.
const RESERVE_LUA = `
local p = tonumber(ARGV[1])
local tokLimit = tonumber(ARGV[2])
local ipLimit = tonumber(ARGV[3])
local globalLimit = tonumber(ARGV[4])
local dayTtl = tonumber(ARGV[5])
local monthTtl = tonumber(ARGV[6])
local tok = tonumber(redis.call('GET', KEYS[1]) or '0')
local ip = tonumber(redis.call('GET', KEYS[2]) or '0')
local g = tonumber(redis.call('GET', KEYS[3]) or '0')
if tok + p > tokLimit then return 'token' end
if ip + p > ipLimit then return 'ip' end
if g + p > globalLimit then return 'global' end
redis.call('INCRBY', KEYS[1], p)
redis.call('EXPIRE', KEYS[1], dayTtl)
redis.call('INCRBY', KEYS[2], p)
redis.call('EXPIRE', KEYS[2], dayTtl)
redis.call('INCRBY', KEYS[3], p)
redis.call('EXPIRE', KEYS[3], monthTtl)
return 'ok'
`;

// Refund the over-reserved delta, clamped at zero (a bucket may have expired between
// reserve + refund), preserving the existing TTL.
const REFUND_LUA = `
local d = tonumber(ARGV[1])
for i = 1, 3 do
  local v = tonumber(redis.call('GET', KEYS[i]) or '0')
  local nv = v - d
  if nv < 0 then nv = 0 end
  redis.call('SET', KEYS[i], nv, 'KEEPTTL')
end
return 'ok'
`;

interface BudgetLimits {
  /** Already multiplied by the hard-ceiling fraction. */
  monthly: number;
  perIpDaily: number;
  perTokenDaily: number;
}

interface ReservationKeys {
  tokKey: string;
  ipKey: string;
  globalKey: string;
  projected: number;
}

/**
 * No Redis configured ⇒ admission always granted (local dev / tests). The spend cap is
 * an operator safety control wired in production — the rest of the proxy is unaffected.
 */
export class AllowAllReservation implements BudgetReservation {
  reserve(): Promise<ReservationResult> {
    return Promise.resolve({ granted: true, reservationId: 'dev' });
  }
  refund(): Promise<void> {
    return Promise.resolve();
  }
}

export class RedisBudgetReservation implements BudgetReservation {
  constructor(
    private readonly redis: Redis,
    private readonly limits: BudgetLimits,
  ) {}

  async reserve(input: {
    tokenId: string;
    ip: string;
    projectedTokens: number;
    softFail: boolean;
  }): Promise<ReservationResult> {
    const { day, month } = periodKeys();
    const tokKey = `alias:budget:tok:${input.tokenId}:${day}`;
    const ipKey = `alias:budget:ip:${input.ip}:${day}`;
    const globalKey = `alias:budget:global:${month}`;
    // Soft-failed attestation gets an order-of-magnitude-smaller daily token budget.
    const tokenLimit = input.softFail
      ? Math.floor(this.limits.perTokenDaily / 10)
      : this.limits.perTokenDaily;

    const verdict = (await this.redis.eval(
      RESERVE_LUA,
      [tokKey, ipKey, globalKey],
      [input.projectedTokens, tokenLimit, this.limits.perIpDaily, this.limits.monthly, DAY_TTL_SECONDS, MONTH_TTL_SECONDS],
    )) as string;

    if (verdict !== 'ok') {
      return { granted: false, deniedTier: verdict as ReservationResult['deniedTier'] };
    }
    return {
      granted: true,
      reservationId: encodeReservation({ tokKey, ipKey, globalKey, projected: input.projectedTokens }),
    };
  }

  async refund(input: { reservationId: string; actualTokens: number }): Promise<void> {
    const decoded = decodeReservation(input.reservationId);
    if (!decoded) return;
    const delta = Math.max(0, decoded.projected - input.actualTokens);
    if (delta === 0) return;
    await this.redis.eval(REFUND_LUA, [decoded.tokKey, decoded.ipKey, decoded.globalKey], [delta]);
  }
}

/** UTC day (`YYYYMMDD`) + month (`YYYYMM`) bucket suffixes. */
function periodKeys(): { day: string; month: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = `${now.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${now.getUTCDate()}`.padStart(2, '0');
  return { day: `${y}${m}${d}`, month: `${y}${m}` };
}

function encodeReservation(keys: ReservationKeys): string {
  return Buffer.from(JSON.stringify(keys)).toString('base64url');
}

function decodeReservation(id: string): ReservationKeys | null {
  if (id === 'dev') return null;
  try {
    const parsed = JSON.parse(Buffer.from(id, 'base64url').toString('utf8')) as ReservationKeys;
    if (typeof parsed.projected === 'number' && parsed.tokKey && parsed.ipKey && parsed.globalKey) return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Env-gated factory: Redis-backed reservation when configured, else allow-all (dev). */
export function createBudgetReservation(config: ConfigService<Env, true>): BudgetReservation {
  const redis = getRedis();
  if (!redis) return new AllowAllReservation();
  const monthly = Math.floor(
    config.get('LLM_MONTHLY_TOKEN_BUDGET', { infer: true }) * config.get('LLM_BUDGET_HARD_CEILING', { infer: true }),
  );
  return new RedisBudgetReservation(redis, {
    monthly,
    perIpDaily: config.get('LLM_DAILY_TOKEN_BUDGET_PER_IP', { infer: true }),
    perTokenDaily: config.get('LLM_DAILY_TOKEN_BUDGET_PER_TOKEN', { infer: true }),
  });
}
