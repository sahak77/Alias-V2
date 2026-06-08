import { Logger } from '@nestjs/common';
import type { GenerationRequest } from '@alias/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeTheme } from '../src/infra/normalize';
import { LlmClient } from '../src/infra/llm-client';
import type { Provider } from '../src/infra/llm-provider';

/**
 * BLOCKING redaction gate (the architecture's highest-risk item). `theme`, the install
 * token, and any BYO-key must never reach a log/span. The OTel export assertion is
 * still pending; the normalizer + the LLM-client error path are covered now.
 */
describe('redaction gate', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  it('the shared normalizer strips zero-width / bidi / control characters', () => {
    const zeroWidth = String.fromCharCode(0x200b);
    const bidi = String.fromCharCode(0x202e);
    const control = String.fromCharCode(0x0007);
    const dirty = `spa${zeroWidth}ce${bidi}expl${control}oration`;

    expect(normalizeTheme(dirty)).toBe('spaceexploration');
  });

  it('the LLM client never leaks the theme in a mapped provider error', async () => {
    const theme = 'super-secret-theme-zzz';
    const request: GenerationRequest = {
      theme,
      locale: 'en',
      count: 5,
      mode: 'create',
      withTaboo: false,
      contentFilter: 'standard',
    };
    const provider: Provider = {
      model: 'fake',
      // A provider error that embeds the theme — the mapped envelope must not surface it.
      generateCards: () => Promise.reject(new Error(`upstream failure for ${theme}`)),
    };

    await expect(
      new LlmClient(provider).generate({ request, systemPrompt: 'sys', userPrompt: 'usr' }),
    ).rejects.toMatchObject({ code: 'INTERNAL', message: expect.not.stringContaining(theme) });
  });

  it.todo('asserts theme/token/BYO-key never appear in exported OTel spans or pino logs');
});
