import { z } from 'zod';

/**
 * The shared error-envelope code set. Every backend failure maps to one of
 * these; the client normalizes `fetch` rejections into OFFLINE / NETWORK_UNAVAILABLE.
 * The app reacts to these softly ("AI temporarily unavailable, saved packs still
 * work") and never lets them bubble toward gameplay UI.
 */
export const ErrorCode = z.enum([
  'OFFLINE', // client-minted: device has no connectivity
  'NETWORK_UNAVAILABLE', // client-minted: fetch rejected / request never reached the server
  'RATE_LIMITED', // per-token or per-IP limit hit
  'BUDGET_EXHAUSTED', // global monthly spend cap reached
  'ATTESTATION_FAILED', // App Attest / Play Integrity rejected
  'CONTENT_REJECTED', // content gate blocked the request or output
  'IP_WATCHLIST', // request IP is watchlisted
  'VALIDATION', // request failed schema validation
  'NOT_IMPLEMENTED', // endpoint is a wired stub (initial scaffold pass)
  'INTERNAL', // unmapped server error (generic; never leaks internals)
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

/** Discriminated error wire shape. Success responses use `{ ok: true, ... }`. */
export const ErrorEnvelope = z.object({
  ok: z.literal(false),
  error: z.object({
    code: ErrorCode,
    /** Safe, user-facing message. MUST never contain `theme`, secrets, or stack traces. */
    message: z.string(),
    /** Client hint: whether retrying could succeed (OFFLINE / NETWORK / RATE_LIMITED -> true). */
    retryable: z.boolean(),
    /** Optional structured context (e.g. Zod field issues for VALIDATION). */
    details: z.record(z.string(), z.unknown()).optional(),
    /** Correlates with a backstage trace for support/debugging. */
    requestId: z.string().optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;
