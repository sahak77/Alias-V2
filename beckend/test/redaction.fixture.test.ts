import { Writable } from 'node:stream';
import { Logger } from '@nestjs/common';
import type { GenerationRequest } from '@alias/contracts';
import type { ExportResult } from '@opentelemetry/core';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import pino from 'pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeTheme } from '../src/infra/normalize';
import { LlmClient } from '../src/infra/llm-client';
import type { Provider } from '../src/infra/llm-provider';
import { loggerOptions } from '../src/infra/logger';
import { RedactingSpanExporter, isSensitiveKey, redactDeep } from '../src/infra/redaction';

/**
 * BLOCKING redaction gate (the architecture's highest-risk item). Asserts that
 * `theme`, the attestation token, and any BYO/provider key NEVER leave the process via
 * an exported span, a Sentry event, a log header, or a mapped error — while benign
 * telemetry (token counts, model, method) survives. If this fails, observability is
 * unsafe to ship.
 */

// Secrets that must never appear in any exported artifact.
const SECRETS = {
  authToken: 'Bearer super-secret-token-123',
  attestation: 'attest-token-xyz',
  byoKey: 'sk-byo-key-abc',
  theme: 'super secret theme value',
  prompt: 'theme: weapons of mass destruction',
  eventTheme: 'leaky theme in a span event',
};

describe('redaction gate', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  it('the shared normalizer strips zero-width / bidi / control characters', () => {
    const dirty = `spa${String.fromCharCode(0x200b)}ce${String.fromCharCode(0x202e)}expl${String.fromCharCode(0x0007)}oration`;
    expect(normalizeTheme(dirty)).toBe('spaceexploration');
  });

  it('the sensitive-key matcher catches secrets but spares benign telemetry', () => {
    for (const key of [
      'http.request.header.authorization',
      'http.request.header.cookie',
      'http.request.header.x-attestation',
      'http.request.header.x-byo-key',
      'http.request.header.x-api-key',
      'gen_ai.prompt',
      'theme',
      'gen_ai.request.theme',
    ]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
    for (const key of [
      'gen_ai.usage.input_tokens',
      'gen_ai.usage.output_tokens',
      'gen_ai.request.model',
      'http.method',
      'http.route',
      'http.status_code',
      'db.system',
    ]) {
      expect(isSensitiveKey(key), key).toBe(false);
    }
  });

  it('RedactingSpanExporter scrubs span + event attributes before export, keeping the rest', () => {
    const fakeSpan = {
      name: 'POST /v1/generate',
      attributes: {
        'http.request.header.authorization': [SECRETS.authToken],
        'http.request.header.x-attestation': [SECRETS.attestation],
        'http.request.header.x-byo-key': [SECRETS.byoKey],
        'gen_ai.prompt': SECRETS.prompt,
        theme: SECRETS.theme,
        'http.method': 'POST',
        'gen_ai.usage.output_tokens': 540,
        'gen_ai.usage.prompt_tokens': 320, // benign metric — must NOT be redacted
      },
      events: [{ name: 'exception', attributes: { theme: SECRETS.eventTheme }, time: [0, 0], droppedAttributesCount: 0 }],
      links: [{ context: { traceId: 'l1', spanId: 'l2', traceFlags: 1 }, attributes: { 'http.request.header.x-attestation': SECRETS.attestation } }],
      status: { code: 2, message: `generation failed: ${SECRETS.theme}` },
      spanContext: () => ({ traceId: 'abc', spanId: 'def', traceFlags: 1 }),
    } as unknown as ReadableSpan;

    const captured: ReadableSpan[] = [];
    const inner: SpanExporter = {
      export: (spans, cb) => {
        captured.push(...spans);
        cb({ code: 0 } as ExportResult);
      },
      shutdown: () => Promise.resolve(),
    };

    new RedactingSpanExporter(inner).export([fakeSpan], () => undefined);
    expect(captured).toHaveLength(1);
    const out = captured[0]!;

    expect(out.attributes['http.request.header.authorization']).toBe('[redacted]');
    expect(out.attributes['http.request.header.x-attestation']).toBe('[redacted]');
    expect(out.attributes['http.request.header.x-byo-key']).toBe('[redacted]');
    expect(out.attributes['gen_ai.prompt']).toBe('[redacted]');
    expect(out.attributes['theme']).toBe('[redacted]');
    expect(out.events[0]?.attributes?.['theme']).toBe('[redacted]');
    expect(out.links[0]?.attributes?.['http.request.header.x-attestation']).toBe('[redacted]');
    expect(out.status.message).toBe('[redacted]'); // status MESSAGE redacted; code survives
    expect(out.status.code).toBe(2);
    // Benign telemetry survives (no over-redaction), and methods still work through the proxy.
    expect(out.attributes['http.method']).toBe('POST');
    expect(out.attributes['gen_ai.usage.output_tokens']).toBe(540);
    expect(out.attributes['gen_ai.usage.prompt_tokens']).toBe(320);
    expect(out.spanContext().traceId).toBe('abc');

    // The strongest gate: no secret survives serialization of the FULL exported span.
    const serialized = JSON.stringify({
      name: out.name,
      attributes: out.attributes,
      events: out.events,
      links: out.links,
      status: out.status,
    });
    for (const secret of Object.values(SECRETS)) {
      expect(serialized, secret).not.toContain(secret);
    }
  });

  it('redactDeep scrubs a nested Sentry-style event (the beforeSend path)', () => {
    const event = {
      level: 'error',
      request: {
        method: 'POST',
        url: '/v1/generate',
        headers: { authorization: SECRETS.authToken, 'x-attestation': SECRETS.attestation, 'content-type': 'application/json' },
      },
      extra: { theme: SECRETS.theme, model: 'claude-haiku-4-5' },
    };
    const scrubbed = redactDeep(event) as typeof event;

    expect(scrubbed.request.headers.authorization).toBe('[redacted]');
    expect(scrubbed.request.headers['x-attestation']).toBe('[redacted]');
    expect(scrubbed.extra.theme).toBe('[redacted]');
    // Non-sensitive context is preserved for debugging.
    expect(scrubbed.request.method).toBe('POST');
    expect(scrubbed.request.headers['content-type']).toBe('application/json');
    expect(scrubbed.extra.model).toBe('claude-haiku-4-5');
    expect(JSON.stringify(scrubbed)).not.toContain(SECRETS.theme);
    expect(JSON.stringify(scrubbed)).not.toContain(SECRETS.attestation);
  });

  it('the pino logger config strips sensitive request headers (the first line of defense)', () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(String(chunk));
        cb();
      },
    });
    const redact = (loggerOptions.pinoHttp as { redact?: pino.LoggerOptions['redact'] }).redact;
    const logger = pino({ redact }, stream);

    logger.info(
      {
        req: {
          headers: {
            authorization: SECRETS.authToken,
            'x-attestation': SECRETS.attestation,
            'x-byo-key': SECRETS.byoKey,
            'content-type': 'application/json',
          },
        },
      },
      'incoming request',
    );

    const output = lines.join('');
    expect(output).not.toContain(SECRETS.authToken);
    expect(output).not.toContain(SECRETS.attestation);
    expect(output).not.toContain(SECRETS.byoKey);
    expect(output).toContain('application/json'); // benign header survives
  });

  it('the LLM client never leaks the theme in a mapped provider error', async () => {
    const request: GenerationRequest = {
      theme: SECRETS.theme,
      locale: 'en',
      count: 5,
      mode: 'create',
      withTaboo: false,
      contentFilter: 'standard',
    };
    const provider: Provider = {
      model: 'fake',
      generateCards: () => Promise.reject(new Error(`upstream failure for ${SECRETS.theme}`)),
    };

    await expect(
      new LlmClient(provider).generate({ request, systemPrompt: 'sys', userPrompt: 'usr' }),
    ).rejects.toMatchObject({ code: 'INTERNAL', message: expect.not.stringContaining(SECRETS.theme) });
  });
});
