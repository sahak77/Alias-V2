import type { ErrorCode } from '@alias/contracts';

/** Maps each error-envelope code to its HTTP status. */
export const CODE_STATUS: Record<ErrorCode, number> = {
  OFFLINE: 503,
  NETWORK_UNAVAILABLE: 503,
  RATE_LIMITED: 429,
  BUDGET_EXHAUSTED: 429,
  ATTESTATION_FAILED: 401,
  CONTENT_REJECTED: 422,
  IP_WATCHLIST: 403,
  VALIDATION: 422,
  NOT_IMPLEMENTED: 501,
  INTERNAL: 500,
};

/** Codes for which retrying could plausibly succeed. */
const RETRYABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'OFFLINE',
  'NETWORK_UNAVAILABLE',
  'RATE_LIMITED',
  'INTERNAL',
]);

/**
 * The single error type backend code throws. The global ErrorEnvelopeFilter renders
 * it as the shared @alias/contracts `ErrorEnvelope`. NEVER put `theme`, secrets, or
 * stack traces in `message` — it is user-facing.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: { details?: Record<string, unknown>; retryable?: boolean },
  ) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = CODE_STATUS[code];
    this.retryable = options?.retryable ?? RETRYABLE.has(code);
    this.details = options?.details;
  }

  static notImplemented(feature: string): AppError {
    return new AppError('NOT_IMPLEMENTED', `${feature} is not implemented yet.`);
  }
}
