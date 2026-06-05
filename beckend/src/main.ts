// OTel SDK MUST load before anything it auto-instruments (HTTP, pg, redis). It is
// a no-op without an OTLP endpoint, so this is safe on a fresh, offline boot.
import './infra/otel';
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  // Structured, trace-correlated logging. The global ZodValidationPipe and the
  // error-envelope exception filter are registered in AppModule (APP_PIPE/APP_FILTER).
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  // OpenAPI — nestjs-zod's cleanupOpenApiDoc post-processes the generated document
  // so `createZodDto` schemas render correctly (replaces the old patchNestJsSwagger).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Alias Backend')
    .setDescription('AI word-pack generation proxy + OTA content policy. Never gates gameplay.')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const openApiDoc = cleanupOpenApiDoc(SwaggerModule.createDocument(app, swaggerConfig), {
    version: '3.1',
  });
  // @nestjs/swagger still labels the document 3.0.0; cleanupOpenApiDoc has already
  // applied 3.1 null semantics, so stamp the version string to match (OpenAPI 3.1).
  openApiDoc.openapi = '3.1.0';
  SwaggerModule.setup('docs', app, openApiDoc);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
