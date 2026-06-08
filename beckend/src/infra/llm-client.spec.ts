import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { GenerationRequest, WordCard } from '@alias/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmClient } from './llm-client';
import type { Provider, ProviderResult } from './llm-provider';

const REQUEST: GenerationRequest = {
  theme: 'space',
  locale: 'en',
  count: 25,
  mode: 'create',
  withTaboo: false,
  contentFilter: 'standard',
};

function resolvingProvider(cards: unknown[], usage?: ProviderResult['usage']): Provider {
  return { model: 'fake', generateCards: () => Promise.resolve({ cards: cards as WordCard[], usage }) };
}
function rejectingProvider(err: unknown): Provider {
  return { model: 'fake', generateCards: () => Promise.reject(err) };
}

const input = (request = REQUEST) => ({ request, systemPrompt: 'sys', userPrompt: 'usr' });

describe('LlmClient', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  it('Zod-re-validates, drops invalid cards, dedupes by normalized word, and caps to count', async () => {
    const client = new LlmClient(
      resolvingProvider([{ w: 'Apple' }, { w: 'apple' }, { w: 'pear' }, { d: 'no word' }, { w: 'plum' }]),
    );
    const res = await client.generate(input({ ...REQUEST, count: 2 }));
    expect(res.cards.map((c) => c.w)).toEqual(['Apple', 'pear']); // 'apple' deduped, invalid dropped, capped
    expect(res.model).toBe('fake');
  });

  it('passes through valid cards up to count when there is no duplication', async () => {
    const cards = Array.from({ length: 30 }, (_, i) => ({ w: `w${i}` }));
    const client = new LlmClient(resolvingProvider(cards, { inputTokens: 10, outputTokens: 20 }));
    const res = await client.generate(input());
    expect(res.cards).toHaveLength(25);
    expect(res.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
  });

  it('throws INTERNAL when the provider returns no usable cards', async () => {
    const client = new LlmClient(resolvingProvider([{ d: 'no word' }, { w: '' }]));
    await expect(client.generate(input())).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('maps a 429 provider error to RATE_LIMITED', async () => {
    const client = new LlmClient(rejectingProvider(new Anthropic.APIError(429, undefined, 'busy', undefined)));
    await expect(client.generate(input())).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('maps a 5xx provider error to NETWORK_UNAVAILABLE', async () => {
    const client = new LlmClient(rejectingProvider(new Anthropic.APIError(503, undefined, 'down', undefined)));
    await expect(client.generate(input())).rejects.toMatchObject({ code: 'NETWORK_UNAVAILABLE' });
  });

  it('maps a non-429 4xx provider error to a NON-retryable INTERNAL', async () => {
    const client = new LlmClient(rejectingProvider(new Anthropic.APIError(400, undefined, 'bad request', undefined)));
    await expect(client.generate(input())).rejects.toMatchObject({ code: 'INTERNAL', retryable: false });
  });

  it('maps an unknown provider error to INTERNAL', async () => {
    const client = new LlmClient(rejectingProvider(new Error('boom')));
    await expect(client.generate(input())).rejects.toMatchObject({ code: 'INTERNAL' });
  });
});
