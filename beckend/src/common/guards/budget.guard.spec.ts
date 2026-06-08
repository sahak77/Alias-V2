import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { BudgetGuard, projectTokens, type BudgetReservation, type ReservationResult } from './budget.guard';
import type { ProxyRequest } from '../proxy-request';

function ctxFor(req: Record<string, unknown>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}
function reservation(result: ReservationResult): { impl: BudgetReservation; reserve: ReturnType<typeof vi.fn> } {
  const reserve = vi.fn(() => Promise.resolve(result));
  return { impl: { reserve, refund: () => Promise.resolve() }, reserve };
}
const baseReq = (): Record<string, unknown> => ({
  headers: {},
  ip: '1.2.3.4',
  body: { count: 25, withTaboo: false },
  attestation: { softFail: false },
});

describe('projectTokens', () => {
  it('is positive, grows with withTaboo, and caps count at 50', () => {
    expect(projectTokens(25, false)).toBeGreaterThan(0);
    expect(projectTokens(25, true)).toBeGreaterThan(projectTokens(25, false));
    expect(projectTokens(1000, false)).toEqual(projectTokens(50, false)); // server re-caps
  });
});

describe('BudgetGuard', () => {
  it('grants admission and attaches the reservation handle', async () => {
    const { impl, reserve } = reservation({ granted: true, reservationId: 'r1' });
    const guard = new BudgetGuard(impl);
    const req = baseReq();
    await expect(guard.canActivate(ctxFor(req))).resolves.toBe(true);
    expect((req as unknown as ProxyRequest).budget).toMatchObject({ reservationId: 'r1' });
    expect(reserve).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '1.2.3.4', softFail: false, projectedTokens: projectTokens(25, false) }),
    );
  });

  it('forwards the soft-fail tier from the attestation guard', async () => {
    const { impl, reserve } = reservation({ granted: true, reservationId: 'r1' });
    const req = { ...baseReq(), attestation: { softFail: true } };
    await new BudgetGuard(impl).canActivate(ctxFor(req));
    expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ softFail: true }));
  });

  it('maps a global-tier denial to BUDGET_EXHAUSTED', async () => {
    const guard = new BudgetGuard(reservation({ granted: false, deniedTier: 'global' }).impl);
    await expect(guard.canActivate(ctxFor(baseReq()))).rejects.toMatchObject({ code: 'BUDGET_EXHAUSTED' });
  });

  it('maps a token/IP-tier denial to RATE_LIMITED', async () => {
    const tokenGuard = new BudgetGuard(reservation({ granted: false, deniedTier: 'token' }).impl);
    await expect(tokenGuard.canActivate(ctxFor(baseReq()))).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    const ipGuard = new BudgetGuard(reservation({ granted: false, deniedTier: 'ip' }).impl);
    await expect(ipGuard.canActivate(ctxFor(baseReq()))).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });
});
