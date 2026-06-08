import type { Attributes } from '@opentelemetry/api';
import type { ExportResult } from '@opentelemetry/core';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

/**
 * In-process redaction — the FIRST line of the redaction gate (the architecture's
 * highest-risk item). `theme` (untrusted free-text), the anti-abuse attestation token,
 * and any BYO / provider API key must NEVER leave the process via a span, log, or
 * Sentry event. A blocking CI fixture (test/redaction.fixture.test.ts) asserts this.
 *
 * Key-based by design: we drop the VALUE of any field whose KEY looks sensitive, so
 * benign telemetry — token COUNTS, model, route, status — survives. An OTel Collector
 * redaction processor can layer on top in prod; this is the in-process safety net.
 *
 * LIMITATION: key-based redaction does NOT scrub a secret embedded inside an arbitrary
 * string VALUE (e.g. `theme` interpolated into an error message or stack). There is no
 * reliable generic way to detect arbitrary user text, so the invariant is enforced by
 * discipline instead: NEVER interpolate `theme`/secrets into a log line, error message,
 * span name, or exception — see app-error.ts + llm-client.ts mapProviderError (which the
 * blocking fixture covers). `sendDefaultPii: false` + input-capture-off keep them out too.
 */

export const REDACTED = '[redacted]';

// Case-insensitive. Word-boundaried where a bare substring would over-match: NOT a bare
// /token/ (would nuke `gen_ai.usage.input_tokens`/`output_tokens`), and `\bprompt\b`
// (not bare /prompt/) so `gen_ai.usage.prompt_tokens` survives while `gen_ai.prompt`
// (the user prompt carrying the theme DATA block) is caught. Each alternative targets a
// real secret-bearing key (request headers, the user prompt/theme, provider keys).
const SENSITIVE_KEY = /authorization|cookie|attestation|byo[\W_]?key|api[\W_]?key|secret|passw(?:or)?d|\btheme\b|\bprompt\b/i;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

/** Flat redaction (span attributes, headers): replace the value of any sensitive key. */
export function redactAttributes(attributes: Attributes): Attributes {
  const out: Attributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    out[key] = isSensitiveKey(key) ? REDACTED : value;
  }
  return out;
}

/** Deep redaction (nested objects — Sentry events, request envelopes). */
export function redactDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactDeep(item));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED : redactDeep(val);
    }
    return out;
  }
  return value;
}

/**
 * Wrap a ReadableSpan so its attributes (and event attributes) are redacted when the
 * exporter reads them. A Proxy keeps the full ReadableSpan surface (spanContext(),
 * resource, timings, …) intact while substituting only the sensitive fields.
 */
export function redactSpan(span: ReadableSpan): ReadableSpan {
  const attributes = redactAttributes(span.attributes);
  const events = span.events.map((event) => ({
    ...event,
    attributes: event.attributes ? redactAttributes(event.attributes) : event.attributes,
  }));
  const links = span.links.map((link) => ({
    ...link,
    attributes: link.attributes ? redactAttributes(link.attributes) : link.attributes,
  }));
  // The status MESSAGE can carry an error string; drop it (the status CODE — the
  // OK/ERROR signal — survives). `resource` is bootstrap-only (service name/version,
  // never user data), so it is intentionally left intact.
  const status = span.status.message ? { ...span.status, message: REDACTED } : span.status;
  return new Proxy(span, {
    get(target, prop, receiver) {
      if (prop === 'attributes') return attributes;
      if (prop === 'events') return events;
      if (prop === 'links') return links;
      if (prop === 'status') return status;
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  });
}

/** A SpanExporter that redacts every span before delegating to the real exporter. */
export class RedactingSpanExporter implements SpanExporter {
  constructor(private readonly inner: SpanExporter) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    this.inner.export(spans.map(redactSpan), resultCallback);
  }

  shutdown(): Promise<void> {
    return this.inner.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.inner.forceFlush ? this.inner.forceFlush() : Promise.resolve();
  }
}
