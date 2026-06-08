import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AttestationGuard, type AttestationResult, type AttestationVerifier } from './attestation.guard';
import type { ProxyRequest } from '../proxy-request';

function ctxFor(req: Record<string, unknown>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}
function verifier(result: AttestationResult): AttestationVerifier {
  return { verify: () => Promise.resolve(result) };
}
const reqWith = (body: Record<string, unknown>): Record<string, unknown> => ({ headers: {}, body });

describe('AttestationGuard', () => {
  it('rejects when the verifier does not pass', async () => {
    const guard = new AttestationGuard(verifier({ passed: false, softFail: false }));
    await expect(guard.canActivate(ctxFor(reqWith({ count: 25 })))).rejects.toMatchObject({
      code: 'ATTESTATION_FAILED',
    });
  });

  it('allows a hard pass and records the (non-soft) tier', async () => {
    const guard = new AttestationGuard(verifier({ passed: true, softFail: false }));
    const req = reqWith({ count: 25 });
    await expect(guard.canActivate(ctxFor(req))).resolves.toBe(true);
    expect((req as unknown as ProxyRequest).attestation).toEqual({ softFail: false });
  });

  it('allows a soft pass on a normal request and records the soft tier', async () => {
    const guard = new AttestationGuard(verifier({ passed: true, softFail: true }));
    const req = reqWith({ count: 25, withTaboo: false });
    await expect(guard.canActivate(ctxFor(req))).resolves.toBe(true);
    expect((req as unknown as ProxyRequest).attestation).toEqual({ softFail: true });
  });

  it('requires a hard pass for an expensive count (>50)', async () => {
    const guard = new AttestationGuard(verifier({ passed: true, softFail: true }));
    await expect(guard.canActivate(ctxFor(reqWith({ count: 100 })))).rejects.toMatchObject({
      code: 'ATTESTATION_FAILED',
    });
  });

  it('requires a hard pass for withTaboo', async () => {
    const guard = new AttestationGuard(verifier({ passed: true, softFail: true }));
    await expect(guard.canActivate(ctxFor(reqWith({ count: 10, withTaboo: true })))).rejects.toMatchObject({
      code: 'ATTESTATION_FAILED',
    });
  });

  it('allows withTaboo on a hard pass', async () => {
    const guard = new AttestationGuard(verifier({ passed: true, softFail: false }));
    await expect(guard.canActivate(ctxFor(reqWith({ count: 10, withTaboo: true })))).resolves.toBe(true);
  });
});
