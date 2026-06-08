import type { FastifyRequest } from 'fastify';

/**
 * The proxy's per-request context. The attestation + budget guards attach these so
 * later stages (budget tiering, refund) read them instead of re-deriving — see
 * generation.controller.ts and the guards under common/guards/.
 */
export interface ProxyRequest extends FastifyRequest {
  /** AttestationGuard → the verified tier; selects the budget bucket. */
  attestation?: { softFail: boolean };
  /** BudgetGuard → the reservation handle, refunded once actual usage is known. */
  budget?: { reservationId: string; projectedTokens: number };
}
