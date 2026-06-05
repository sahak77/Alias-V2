import { Injectable } from '@nestjs/common';
import type { GenerationRequest, GenerationResponse } from '@alias/contracts';
import { LlmClient } from '../../infra/llm-client';

@Injectable()
export class GenerationService {
  constructor(private readonly llm: LlmClient) {}

  // TODO(generation): normalize+gate input -> reserve budget -> provider call ->
  // per-chunk Zod re-validate -> output re-scan. The controller -> service -> llm
  // chain is wired now; the LLM client returns the NOT_IMPLEMENTED envelope.
  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const result = await this.llm.generate(request);
    return { ok: true, cards: result.cards, meta: result.meta };
  }
}
