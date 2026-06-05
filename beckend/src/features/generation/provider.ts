import type { AiMeta, GenerationRequest, WordCard } from '@alias/contracts';

/**
 * LLM Provider seam — swappable (Anthropic Haiku 4.5 first; Gemini Flash-Lite is a
 * one-file swap if the spend cap binds). The real impl does forced structured
 * output + per-chunk Zod re-validate + tool_use fallback.
 */
export interface Provider {
  readonly model: string;
  generateCards(input: {
    request: GenerationRequest;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<{ cards: WordCard[]; meta: AiMeta }>;
}

/** Placeholder provider — no Anthropic SDK call. Replaced when generation is wired. */
export class StubProvider implements Provider {
  readonly model = 'stub';

  generateCards(): Promise<{ cards: WordCard[]; meta: AiMeta }> {
    return Promise.reject(new Error('Provider not implemented'));
  }
}
