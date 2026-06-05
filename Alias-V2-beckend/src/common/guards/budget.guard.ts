import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Spend-cap seam: admission control, NOT a post-hoc counter. Before each provider
 * call, atomically RESERVE projected-max tokens against three tiers (per-token
 * daily, per-IP daily, global monthly) via an Upstash Lua EVAL; reject if it would
 * exceed; refund the delta after actual usage. Hard ceiling ~85–90%; alert at 70/90%.
 * Cap `count * 1.5` server-side regardless of the client value.
 */
export interface BudgetReservation {
  reserve(input: {
    tokenId: string;
    ip: string;
    projectedTokens: number;
  }): Promise<ReservationResult>;
  refund(input: { reservationId: string; actualTokens: number }): Promise<void>;
}

export interface ReservationResult {
  granted: boolean;
  reservationId?: string;
}

@Injectable()
export class BudgetGuard implements CanActivate {
  // TODO(generation): reserve before the provider call; on denial throw
  // `new AppError('BUDGET_EXHAUSTED')` or `'RATE_LIMITED'`.
  canActivate(_context: ExecutionContext): boolean {
    // Seam: pass-through until the spend cap is wired (no Redis at boot).
    return true;
  }
}
