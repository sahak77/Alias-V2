import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

/**
 * OpenTelemetry bootstrap. OPT-IN: with no OTLP endpoint configured this is a
 * no-op, so the app boots with zero outbound connections. Imported FIRST in main.ts
 * so HTTP/pg/redis auto-instrumentation wraps those libs before they load.
 *
 * The OTel Collector is the canonical redaction chokepoint — `theme`, the anon
 * install token, and any BYO-key header must be dropped/hashed before export.
 */
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

let sdk: NodeSDK | undefined;

if (endpoint) {
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'alias-backend',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.1',
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();

  const shutdown = (): void => {
    void sdk?.shutdown().finally(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

export { sdk };
