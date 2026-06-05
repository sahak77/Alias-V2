import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Anti-abuse seam: App Attest (iOS) / Play Integrity (Android), server-verified.
 * Implement behind this Verifier interface with a BOUNDED soft-fail tier (an
 * order-of-magnitude-smaller budget — never a free pass) and require a HARD pass
 * for expensive/kids paths (count>50, withTaboo, kids). On failure the wired guard
 * throws `new AppError('ATTESTATION_FAILED')`.
 */
export interface AttestationVerifier {
  verify(token: string | undefined): Promise<AttestationResult>;
}

export interface AttestationResult {
  passed: boolean;
  softFail: boolean;
}

@Injectable()
export class AttestationGuard implements CanActivate {
  // TODO(generation): inject an AttestationVerifier; enforce hard-pass for
  // expensive/kids paths; alert on soft-fail spikes (= attack).
  canActivate(_context: ExecutionContext): boolean {
    // Seam: pass-through until anti-abuse is wired (no attestation infra at boot).
    return true;
  }
}
