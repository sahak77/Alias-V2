import * as Sentry from '@sentry/node';
import { redactDeep } from './redaction';

/**
 * Sentry error reporting. OPT-IN (env-gated on `SENTRY_DSN`): a no-op on a fresh /
 * offline boot. Errors only — tracing is OTel's job (`infra/otel.ts`), so we skip
 * Sentry's own OpenTelemetry setup to avoid fighting the NodeSDK.
 *
 * `beforeSend` runs every event through `redactDeep`, and `sendDefaultPii: false`
 * keeps request bodies (where `theme` lives) and IPs off the event — so `theme`, the
 * attestation token, and any BYO key never reach Sentry. The blocking redaction
 * fixture covers the scrubber.
 */
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    skipOpenTelemetrySetup: true,
    beforeSend: (event) => redactDeep(event) as typeof event,
  });
}
