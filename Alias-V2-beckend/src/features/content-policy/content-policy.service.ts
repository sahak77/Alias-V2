import { Injectable } from '@nestjs/common';
import type { ContentPolicy, Locale } from '@alias/contracts';
import { AppError } from '../../common/errors/app-error';

@Injectable()
export class ContentPolicyService {
  // TODO(content-policy): read policy/{locale}/latest.json from R2 (infra/r2),
  // cache (short TTL, stale-while-revalidate), and validate with the ContentPolicy
  // schema before returning.
  async getPolicy(_locale: Locale): Promise<ContentPolicy> {
    throw AppError.notImplemented('Content policy delivery');
  }
}
