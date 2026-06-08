import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import type { ContentPolicy, WordCard } from '@alias/contracts';
import { ContentPolicyService } from '../../features/content-policy/content-policy.service';
import { assertInputAllowed, filterOutput } from '../../features/generation/content-gate';
import { normalizeTheme } from '../../infra/normalize';
import type { ProxyRequest } from '../proxy-request';

/**
 * Content gate (FIRM v2): normalize the untrusted `theme` in place (so the validated
 * DTO + prompt use the clean value), enforce the per-locale OTA blocklist BEFORE the
 * provider call, then re-scan the generated cards on the way back. A rejected theme
 * throws CONTENT_REJECTED — the outer BudgetInterceptor refunds the reservation, so a
 * banned theme can't drain the spend-cap counter.
 *
 * Runs INSIDE the BudgetInterceptor and BEFORE the ZodValidationPipe (NestJS order:
 * guards → interceptors → pipes → handler) — the in-place theme normalization relies
 * on that ordering so the pipe validates (and the prompt uses) the cleaned value.
 */
@Injectable()
export class ContentGateInterceptor implements NestInterceptor {
  constructor(private readonly policy: ContentPolicyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<ProxyRequest>();
    const body = req.body as { theme?: unknown; locale?: unknown } | undefined;

    let policy: ContentPolicy | null = null;
    if (body && typeof body.theme === 'string') {
      const theme = normalizeTheme(body.theme);
      body.theme = theme; // clean before the pipe validates the DTO + the prompt is built
      if (typeof body.locale === 'string') {
        policy = await this.policy.getPolicy(body.locale).catch(() => null);
      }
      assertInputAllowed(theme, policy); // throws CONTENT_REJECTED if banned (budget refunded upstream)
    }

    return next.handle().pipe(
      map((res) => {
        if (res && typeof res === 'object' && Array.isArray((res as { cards?: unknown }).cards)) {
          const response = res as { cards: WordCard[] };
          return { ...response, cards: filterOutput(response.cards, policy) };
        }
        return res;
      }),
    );
  }
}
