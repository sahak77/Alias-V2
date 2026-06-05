import { Injectable } from '@nestjs/common';
import type { AiMeta, GenerationRequest, WordCard } from '@alias/contracts';
import { AppError } from '../common/errors/app-error';

export interface LlmGenerateResult {
  cards: WordCard[];
  meta: AiMeta;
}

/**
 * The ONE instrumented LLM wrapper. ALL provider calls go through here, making this
 * the single chokepoint for Langfuse spans + redaction: `theme`, tokens, and any
 * BYO-key must never reach a span or log. Stubbed until the generation proxy lands.
 */
@Injectable()
export class LlmClient {
  // TODO(generation): wrap the Provider call in a Langfuse span; forced structured
  // output + per-chunk Zod re-validate + tool_use fallback; redact theme on export.
  async generate(_request: GenerationRequest): Promise<LlmGenerateResult> {
    throw AppError.notImplemented('AI generation');
  }
}
