import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';
import { BUDGET_RESERVATION, type BudgetReservation } from '../guards/budget.guard';
import type { ProxyRequest } from '../proxy-request';

/**
 * Spend-cap refund chokepoint. The BudgetGuard RESERVES projected-max tokens before
 * the request runs; this outer interceptor guarantees the reservation is returned on
 * ANY failure after it — provider error, post-normalization Zod validation failure,
 * content-policy rejection, or handler error. Without it, an attacker could drain the
 * cap by inducing errors that reserve but never spend (tokens would lock until TTL).
 *
 * Must be the OUTERMOST interceptor on the generation controller so its catchError
 * wraps the content gate + the validation pipe + the handler. The SUCCESS path refunds
 * the projected-vs-actual delta in GenerationService (the only place that knows usage);
 * the two paths are mutually exclusive, so there is no double refund.
 */
@Injectable()
export class BudgetInterceptor implements NestInterceptor {
  constructor(@Inject(BUDGET_RESERVATION) private readonly budget: BudgetReservation) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<ProxyRequest>();
    return next.handle().pipe(
      catchError((err: unknown) => {
        if (req.budget) {
          // Full refund (no usage on a failed call); never let a refund error mask the original.
          void this.budget
            .refund({ reservationId: req.budget.reservationId, actualTokens: 0 })
            .catch(() => undefined);
        }
        return throwError(() => err);
      }),
    );
  }
}
