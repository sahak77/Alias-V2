import { Inject, Injectable, Logger } from '@nestjs/common';
import type { GenerationRequest, GenerationResponse } from '@alias/contracts';
import { LlmClient } from '../../infra/llm-client';
import { BUDGET_RESERVATION, type BudgetReservation } from '../../common/guards/budget.guard';
import { buildUserPrompt, PROMPT_VERSION, SYSTEM_PROMPT } from './prompt';

export interface GenerateContext {
  /** The BudgetGuard reservation handle, refunded once actual usage is known. */
  reservation?: { reservationId: string; projectedTokens: number };
  /** Propagated to the provider so a client disconnect aborts the in-flight chunk. */
  signal?: AbortSignal;
}

/**
 * Orchestrates one chunk: build the fixed system prompt + theme DATA block, call the
 * instrumented LlmClient, then refund the over-reserved budget delta. The `theme` is
 * already normalized + gated by the ContentGateInterceptor before it reaches here.
 */
@Injectable()
export class GenerationService {
  private readonly log = new Logger(GenerationService.name);

  constructor(
    private readonly llm: LlmClient,
    @Inject(BUDGET_RESERVATION) private readonly budget: BudgetReservation,
  ) {}

  async generate(request: GenerationRequest, ctx: GenerateContext = {}): Promise<GenerationResponse> {
    const result = await this.llm.generate({
      request,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(request, request.theme),
      signal: ctx.signal,
    });

    // Refund the projected-vs-actual delta (fire-and-forget — never blocks the chunk).
    if (ctx.reservation && result.usage) {
      const actualTokens = result.usage.inputTokens + result.usage.outputTokens;
      void this.refund(ctx.reservation.reservationId, actualTokens);
    }

    return {
      ok: true,
      cards: result.cards,
      meta: { model: result.model, promptVersion: PROMPT_VERSION, generatedAt: new Date().toISOString() },
    };
  }

  private async refund(reservationId: string, actualTokens: number): Promise<void> {
    try {
      await this.budget.refund({ reservationId, actualTokens });
    } catch {
      // A failed refund must never break a successful generation; the daily/monthly
      // window rolls over and self-heals.
      this.log.warn('budget refund failed (non-fatal)');
    }
  }
}
