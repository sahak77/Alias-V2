import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { BudgetInterceptor } from './budget.interceptor';
import type { BudgetReservation } from '../guards/budget.guard';

function ctxFor(req: Record<string, unknown>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}
const refundMock = () => vi.fn<BudgetReservation['refund']>(() => Promise.resolve());
function budgetWith(refund: BudgetReservation['refund']): BudgetReservation {
  return { reserve: () => Promise.resolve({ granted: true }), refund };
}
const erroringHandler = (err: unknown): CallHandler => ({ handle: () => throwError(() => err) });
const successHandler = (value: unknown): CallHandler => ({ handle: () => of(value) });

describe('BudgetInterceptor', () => {
  it('refunds the FULL reservation (actualTokens 0) when the downstream errors, then rethrows', async () => {
    const refund = refundMock();
    const interceptor = new BudgetInterceptor(budgetWith(refund));
    const req = { budget: { reservationId: 'r1', projectedTokens: 5000 } };

    await expect(
      lastValueFrom(interceptor.intercept(ctxFor(req), erroringHandler(new Error('provider boom')))),
    ).rejects.toThrow('provider boom');
    expect(refund).toHaveBeenCalledWith({ reservationId: 'r1', actualTokens: 0 });
  });

  it('does NOT refund on success (the service refunds the delta there)', async () => {
    const refund = refundMock();
    const interceptor = new BudgetInterceptor(budgetWith(refund));
    const req = { budget: { reservationId: 'r1', projectedTokens: 5000 } };

    const out = await lastValueFrom(interceptor.intercept(ctxFor(req), successHandler({ ok: true })));
    expect(out).toEqual({ ok: true });
    expect(refund).not.toHaveBeenCalled();
  });

  it('does nothing when no reservation is attached to the request', async () => {
    const refund = refundMock();
    const interceptor = new BudgetInterceptor(budgetWith(refund));

    await expect(
      lastValueFrom(interceptor.intercept(ctxFor({}), erroringHandler(new Error('x')))),
    ).rejects.toThrow('x');
    expect(refund).not.toHaveBeenCalled();
  });
});
