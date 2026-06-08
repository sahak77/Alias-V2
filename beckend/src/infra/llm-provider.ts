import Anthropic from '@anthropic-ai/sdk';
import type { ConfigService } from '@nestjs/config';
import type { GenerationRequest, WordCard } from '@alias/contracts';
import type { Env } from '../config/env';

/** Provider token usage (internal — drives the spend-cap refund; never wire-exposed). */
export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderResult {
  /** Raw, UNVALIDATED cards — the LlmClient Zod-re-validates before returning them. */
  cards: WordCard[];
  usage?: Usage;
}

/**
 * LLM Provider seam — swappable (Anthropic Haiku 4.5 first; Gemini Flash-Lite is a
 * one-file swap if the spend cap binds). Forced structured output via a single
 * `tool_use` tool; the model guarantee is NOT the parser — the LlmClient re-validates.
 */
export interface Provider {
  readonly model: string;
  generateCards(input: {
    request: GenerationRequest;
    systemPrompt: string;
    userPrompt: string;
    signal?: AbortSignal;
  }): Promise<ProviderResult>;
}

/** DI token for the active Provider (Anthropic when configured, else the stub). */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

const TOOL_NAME = 'emit_word_cards';

/** Forced structured-output schema — one tool, one shape, matches the WordCard contract. */
const CARDS_TOOL_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          w: { type: 'string', description: 'the word or short phrase to guess' },
          d: { type: 'string', description: 'optional one-line description' },
          t: { type: 'array', items: { type: 'string' }, description: 'optional taboo terms' },
          h: { type: 'string', description: 'optional gameplay hint' },
        },
        required: ['w'],
      },
    },
  },
  required: ['cards'],
};

/** Placeholder when no provider key is configured — calling it surfaces as INTERNAL. */
export class StubProvider implements Provider {
  readonly model = 'stub';

  generateCards(): Promise<ProviderResult> {
    return Promise.reject(new Error('AI generation provider is not configured (set ANTHROPIC_API_KEY)'));
  }
}

/** Anthropic Claude (Haiku 4.5) via forced `tool_use` structured output. */
export class AnthropicProvider implements Provider {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async generateCards(input: {
    request: GenerationRequest;
    systemPrompt: string;
    userPrompt: string;
    signal?: AbortSignal;
  }): Promise<ProviderResult> {
    const { request } = input;
    const overGenerate = Math.ceil(request.count * 1.5); // over-generate, dedupe later
    const maxTokens = Math.min(8192, overGenerate * (request.withTaboo ? 90 : 55) + 512);

    const res = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: maxTokens,
        system: input.systemPrompt,
        messages: [{ role: 'user', content: input.userPrompt }],
        tools: [
          {
            name: TOOL_NAME,
            description: `Emit about ${overGenerate} distinct Alias word cards drawn from the given theme, in the requested word language.`,
            input_schema: CARDS_TOOL_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: TOOL_NAME },
      },
      { signal: input.signal },
    );

    const block = res.content.find((b) => b.type === 'tool_use' && b.name === TOOL_NAME);
    if (!block || block.type !== 'tool_use') {
      throw new Error('provider returned no structured tool_use block');
    }
    return {
      cards: extractCards(block.input),
      usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
    };
  }
}

/** Best-effort extraction; shape is enforced by the LlmClient's Zod re-validation. */
function extractCards(input: unknown): WordCard[] {
  if (typeof input === 'object' && input !== null && Array.isArray((input as { cards?: unknown }).cards)) {
    return (input as { cards: WordCard[] }).cards;
  }
  return [];
}

/** Env-gated factory: a real provider when keyed, else the stub (offline-safe boot). */
export function createProvider(config: ConfigService<Env, true>): Provider {
  const apiKey = config.get('ANTHROPIC_API_KEY', { infer: true });
  const model = config.get('LLM_MODEL', { infer: true });
  if (!apiKey) return new StubProvider();
  return new AnthropicProvider(apiKey, model);
}
