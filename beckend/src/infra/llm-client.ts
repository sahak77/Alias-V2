import { Inject, Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { GenerationRequest } from '@alias/contracts';
import { WordCard } from '@alias/contracts';
import { AppError } from '../common/errors/app-error';
import { normalizeText } from './normalize';
import { LLM_PROVIDER, type Provider, type Usage } from './llm-provider';

export interface LlmGenerateInput {
  request: GenerationRequest;
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
}

export interface LlmGenerateResult {
  cards: WordCard[];
  model: string;
  usage?: Usage;
}

/**
 * The ONE instrumented LLM wrapper. ALL provider calls go through here, making this
 * the single chokepoint for redaction + per-chunk Zod re-validation: the model's
 * structured output is NOT trusted as a parser, and `theme`/tokens/keys must never
 * reach a log or span. (Langfuse spans wire here when OTel lands — input-capture off.)
 */
@Injectable()
export class LlmClient {
  private readonly log = new Logger(LlmClient.name);

  constructor(@Inject(LLM_PROVIDER) private readonly provider: Provider) {}

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    const { request } = input;
    let raw: { cards: WordCard[]; usage?: Usage };
    try {
      raw = await this.provider.generateCards({
        request,
        systemPrompt: input.systemPrompt,
        userPrompt: input.userPrompt,
        signal: input.signal,
      });
    } catch (err) {
      throw this.mapProviderError(err, request);
    }

    const cards = this.validateAndDedupe(raw.cards, request.count);
    if (cards.length === 0) {
      this.log.warn(`generation produced no valid cards (locale=${request.locale}, count=${request.count})`);
      throw new AppError('INTERNAL', 'AI generation produced no usable cards. Please try again.');
    }
    return { cards, model: this.provider.model, usage: raw.usage };
  }

  /** Per-chunk Zod re-validate (output is untrusted) + dedupe by normalized word + cap. */
  private validateAndDedupe(input: WordCard[], count: number): WordCard[] {
    const seen = new Set<string>();
    const out: WordCard[] = [];
    for (const candidate of input) {
      const parsed = WordCard.safeParse(candidate);
      if (!parsed.success) continue;
      const card = parsed.data;
      const key = normalizeText(card.w).toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(card);
      if (out.length >= count) break;
    }
    return out;
  }

  /** Map provider failures to the shared envelope — NEVER leaking `theme` or keys. */
  private mapProviderError(err: unknown, request: GenerationRequest): AppError {
    if (err instanceof AppError) return err;
    if (err instanceof Anthropic.APIUserAbortError) {
      return new AppError('NETWORK_UNAVAILABLE', 'AI generation was interrupted.');
    }
    if (err instanceof Anthropic.APIError) {
      // Backstage log carries only safe fields — never the theme.
      this.log.warn(`provider APIError status=${err.status ?? 'n/a'} (locale=${request.locale})`);
      if (err.status === 429) return new AppError('RATE_LIMITED', 'AI provider is busy. Try again shortly.');
      if (err.status !== undefined && err.status >= 500) {
        return new AppError('NETWORK_UNAVAILABLE', 'AI provider is temporarily unavailable.');
      }
      // Other 4xx (bad request, auth, permission) are PERMANENT — never retry (would
      // burn budget on a futile loop). INTERNAL is retryable by default, so opt out.
      if (err.status !== undefined && err.status >= 400) {
        return new AppError('INTERNAL', 'AI generation failed.', { retryable: false });
      }
      return new AppError('INTERNAL', 'AI generation failed. Please try again.');
    }
    this.log.warn(`provider error (locale=${request.locale})`);
    return new AppError('INTERNAL', 'AI generation failed. Please try again.');
  }
}
