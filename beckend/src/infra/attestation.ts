import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import type { AttestationResult, AttestationVerifier } from '../common/guards/attestation.guard';

/**
 * Dev/default verifier: hard-passes. Real App Attest (iOS) / Play Integrity (Android)
 * verification needs platform keys + the (alpha) client lib — a documented seam. The
 * GUARD's tiering logic (bounded soft-fail, hard-pass for expensive paths) is real and
 * runs against whatever verifier is wired here.
 */
export class DevAttestationVerifier implements AttestationVerifier {
  verify(): Promise<AttestationResult> {
    return Promise.resolve({ passed: true, softFail: false });
  }
}

export function createAttestationVerifier(_config: ConfigService<Env, true>): AttestationVerifier {
  // TODO(attestation): when platform keys land, return a real App Attest /
  // Play Integrity verifier with a bounded soft-fail tier. Dev hard-passes for now.
  return new DevAttestationVerifier();
}
