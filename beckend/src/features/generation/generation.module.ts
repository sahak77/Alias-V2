import { Module } from '@nestjs/common';
import { ContentPolicyModule } from '../content-policy/content-policy.module';
import { AttestationGuard } from '../../common/guards/attestation.guard';
import { BudgetGuard } from '../../common/guards/budget.guard';
import { BudgetInterceptor } from '../../common/interceptors/budget.interceptor';
import { ContentGateInterceptor } from '../../common/interceptors/content-gate.interceptor';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';

/**
 * The headline AI word-pack generation proxy: controller -> guards (attestation,
 * budget) -> content-gate interceptor -> service -> instrumented LlmClient -> provider.
 * The swappable adapters (provider/verifier/reservation) are bound in InfraModule;
 * ContentPolicyModule supplies the OTA blocklist the content gate enforces.
 */
@Module({
  imports: [ContentPolicyModule],
  controllers: [GenerationController],
  providers: [GenerationService, AttestationGuard, BudgetGuard, BudgetInterceptor, ContentGateInterceptor],
})
export class GenerationModule {}
