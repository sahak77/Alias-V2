import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { ATTESTATION_VERIFIER } from '../common/guards/attestation.guard';
import { BUDGET_RESERVATION } from '../common/guards/budget.guard';
import { LlmClient } from './llm-client';
import { createProvider, LLM_PROVIDER } from './llm-provider';
import { createAttestationVerifier } from './attestation';
import { createBudgetReservation } from './budget-reservation';

/**
 * Global infra providers. Stateless clients (Redis/R2) are reached via their lazy
 * getters so nothing connects at boot. The proxy's swappable adapters — LLM provider,
 * attestation verifier, budget reservation — are bound here behind DI tokens (ports
 * in infra/common); each factory is env-gated, degrading to a safe stub when unconfigured.
 */
@Global()
@Module({
  providers: [
    LlmClient,
    { provide: LLM_PROVIDER, useFactory: (c: ConfigService<Env, true>) => createProvider(c), inject: [ConfigService] },
    {
      provide: ATTESTATION_VERIFIER,
      useFactory: (c: ConfigService<Env, true>) => createAttestationVerifier(c),
      inject: [ConfigService],
    },
    {
      provide: BUDGET_RESERVATION,
      useFactory: (c: ConfigService<Env, true>) => createBudgetReservation(c),
      inject: [ConfigService],
    },
  ],
  exports: [LlmClient, LLM_PROVIDER, ATTESTATION_VERIFIER, BUDGET_RESERVATION],
})
export class InfraModule {}
