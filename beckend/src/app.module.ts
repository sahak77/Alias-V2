import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { validate } from './config/env';
import { loggerOptions } from './infra/logger';
import { InfraModule } from './infra/infra.module';
import { DbModule } from './db/db.module';
import { GenerationModule } from './features/generation/generation.module';
import { ContentPolicyModule } from './features/content-policy/content-policy.module';
import { LanguagesModule } from './features/languages/languages.module';
import { PacksModule } from './features/packs/packs.module';
import { ErrorEnvelopeFilter } from './common/filters/error-envelope.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate, cache: true }),
    LoggerModule.forRoot(loggerOptions),
    InfraModule,
    DbModule,
    GenerationModule,
    ContentPolicyModule,
    LanguagesModule,
    PacksModule,
    // Seams — accounts / catalog (community Discover/publish) / moderation — NOT imported.
  ],
  controllers: [AppController],
  providers: [
    // Zod is the single DTO source: validate every request against the contract.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Every failure maps to the shared @alias/contracts error envelope.
    { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
  ],
})
export class AppModule {}
