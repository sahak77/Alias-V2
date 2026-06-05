import { Module } from '@nestjs/common';
import { AttestationGuard } from '../../common/guards/attestation.guard';
import { BudgetGuard } from '../../common/guards/budget.guard';
import { ContentGateInterceptor } from '../../common/interceptors/content-gate.interceptor';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';

/**
 * The headline AI word-pack generation proxy. Fully wired (controller -> service ->
 * llm-client) with cross-cutting guards + interceptor attached; the service body is
 * a stub returning the NOT_IMPLEMENTED envelope until the provider is implemented.
 */
@Module({
  controllers: [GenerationController],
  providers: [GenerationService, AttestationGuard, BudgetGuard, ContentGateInterceptor],
})
export class GenerationModule {}
