import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AppError } from '../errors/app-error';
import type { ProxyRequest } from '../proxy-request';

/**
 * Anti-abuse guard: App Attest (iOS) / Play Integrity (Android), server-verified
 * behind the Verifier port. The soft-fail tier is a BOUNDED backdoor (an
 * order-of-magnitude-smaller budget downstream — never a free pass); expensive paths
 * (count>50, withTaboo) require a HARD pass. Failures map to ATTESTATION_FAILED.
 */
export interface AttestationVerifier {
  verify(token: string | undefined): Promise<AttestationResult>;
}

export interface AttestationResult {
  passed: boolean;
  softFail: boolean;
}

/** DI token — InfraModule binds the env-gated verifier adapter (see infra/attestation.ts). */
export const ATTESTATION_VERIFIER = Symbol('ATTESTATION_VERIFIER');

@Injectable()
export class AttestationGuard implements CanActivate {
  constructor(@Inject(ATTESTATION_VERIFIER) private readonly verifier: AttestationVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ProxyRequest>();
    const result = await this.verifier.verify(extractToken(req));
    if (!result.passed) {
      throw new AppError('ATTESTATION_FAILED', 'Device attestation failed.');
    }

    // Expensive paths require a HARD pass — the soft-fail tier may not reach them.
    const body = (req.body ?? {}) as { count?: unknown; withTaboo?: unknown };
    const count = typeof body.count === 'number' ? body.count : 25;
    const withTaboo = body.withTaboo === true;
    if (result.softFail && (count > 50 || withTaboo)) {
      throw new AppError('ATTESTATION_FAILED', 'A verified device is required for this request.');
    }

    req.attestation = { softFail: result.softFail };
    return true;
  }
}

function extractToken(req: ProxyRequest): string | undefined {
  const header = req.headers['x-attestation'];
  if (typeof header === 'string' && header.length > 0) return header;
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return undefined;
}
