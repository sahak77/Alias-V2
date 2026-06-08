import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AppError } from '../errors/app-error';
import type { ProxyRequest } from '../proxy-request';

/**
 * Spend-cap guard: admission control, NOT a post-hoc counter. Before the provider
 * call it RESERVES projected-max tokens across three tiers (per-token daily, per-IP
 * daily, global monthly) via the reservation port; the service refunds the delta
 * after actual usage. Denials map to RATE_LIMITED (token/IP) or BUDGET_EXHAUSTED
 * (global). The reservation adapter lives in infra/budget-reservation.ts.
 */
export interface BudgetReservation {
  reserve(input: {
    tokenId: string;
    ip: string;
    projectedTokens: number;
    softFail: boolean;
  }): Promise<ReservationResult>;
  refund(input: { reservationId: string; actualTokens: number }): Promise<void>;
}

export interface ReservationResult {
  granted: boolean;
  reservationId?: string;
  deniedTier?: 'token' | 'ip' | 'global';
}

/** DI token — InfraModule binds the env-gated reservation adapter. */
export const BUDGET_RESERVATION = Symbol('BUDGET_RESERVATION');

const TOKENS_PER_CARD = 50; // rough projected-max per card (refunded down to actual)
const BASE_PROMPT_TOKENS = 400; // fixed system + theme DATA block overhead

/**
 * Projected-max tokens for a request. The server re-caps `count` and mirrors the
 * provider's `count * 1.5` over-generation regardless of the client value.
 */
export function projectTokens(count: number, withTaboo: boolean): number {
  const capped = Math.min(Math.max(count, 1), 50);
  const overGenerate = Math.ceil(capped * 1.5);
  const perCard = withTaboo ? TOKENS_PER_CARD * 1.6 : TOKENS_PER_CARD;
  return Math.ceil(BASE_PROMPT_TOKENS + overGenerate * perCard);
}

@Injectable()
export class BudgetGuard implements CanActivate {
  constructor(@Inject(BUDGET_RESERVATION) private readonly reservation: BudgetReservation) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ProxyRequest>();
    const body = (req.body ?? {}) as { count?: unknown; withTaboo?: unknown };
    const count = typeof body.count === 'number' ? body.count : 25;
    const withTaboo = body.withTaboo === true;
    const projectedTokens = projectTokens(count, withTaboo);

    const result = await this.reservation.reserve({
      tokenId: extractTokenId(req),
      ip: req.ip,
      projectedTokens,
      softFail: req.attestation?.softFail === true,
    });

    if (!result.granted || !result.reservationId) {
      if (result.deniedTier === 'global') {
        throw new AppError('BUDGET_EXHAUSTED', 'The AI generation budget is exhausted. Saved packs still work.');
      }
      throw new AppError('RATE_LIMITED', 'Too many AI generations right now. Try again shortly.');
    }
    req.budget = { reservationId: result.reservationId, projectedTokens };
    return true;
  }
}

function extractTokenId(req: ProxyRequest): string {
  const header = req.headers['x-attestation'];
  if (typeof header === 'string' && header.length > 0) return header;
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return `ip:${req.ip}`; // unauthenticated callers fall back to an IP-scoped bucket
}
