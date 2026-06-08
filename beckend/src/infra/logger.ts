import type { Params } from 'nestjs-pino';

// Pretty logs only in local development; tests + production emit raw JSON (no
// pino-pretty worker thread, which keeps Vitest clean and prod machine-parseable).
const isDev = process.env.NODE_ENV === 'development';

/**
 * nestjs-pino config. Defense-in-depth redaction here; the OTel Collector remains
 * the canonical chokepoint. `theme` / tokens / BYO-keys must never be logged.
 */
export const loggerOptions: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    transport: isDev ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
    redact: {
      // `x-attestation` carries the anti-abuse device token; bracket-quote it because
      // the header name has a hyphen. `theme` lives in the request body, which
      // autoLogging does not serialize — but never add a body serializer that would.
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-attestation"]'],
      remove: true,
    },
    autoLogging: true,
  },
};
