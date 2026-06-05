import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Content-gate seam (FIRM v2 once generation lands): normalizer + per-locale
 * blocklist + strict-kids system prompt + output re-scan, reading the OTA
 * ContentPolicy. Rejections map to `AppError('CONTENT_REJECTED')`.
 */
@Injectable()
export class ContentGateInterceptor implements NestInterceptor {
  // TODO(generation): normalize the request `theme` (infra/normalize), enforce the
  // per-locale blocklist + server-side kids gate before handing off, then re-scan
  // the generated output on the way back.
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Seam: pass-through until the content gate is wired.
    return next.handle();
  }
}
