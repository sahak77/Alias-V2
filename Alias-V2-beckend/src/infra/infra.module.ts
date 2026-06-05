import { Global, Module } from '@nestjs/common';
import { LlmClient } from './llm-client';

/**
 * Global infra providers. Stateless clients (Redis/R2) are reached via their lazy
 * getters (`getRedis`/`getR2`) so nothing connects at boot; `LlmClient` is the one
 * DI-injectable infra service that feature modules depend on.
 */
@Global()
@Module({
  providers: [LlmClient],
  exports: [LlmClient],
})
export class InfraModule {}
