import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import type { FastifyReply } from 'fastify';
import type { ErrorEnvelope } from '@alias/contracts';
import { AppError } from '../errors/app-error';

/**
 * Catches EVERY thrown error and renders the shared @alias/contracts `ErrorEnvelope`.
 * This is the load-bearing piece: it guarantees the offline-first soft-failure
 * contract the client depends on, and never leaks `theme`, secrets, or stack traces.
 */
@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorEnvelopeFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    reply.status(this.statusFor(exception)).send(this.toEnvelope(exception));
  }

  private statusFor(exception: unknown): number {
    if (exception instanceof AppError) return exception.status;
    if (exception instanceof ZodValidationException) return 422;
    if (exception instanceof HttpException) return exception.getStatus();
    return 500;
  }

  private toEnvelope(exception: unknown): ErrorEnvelope {
    if (exception instanceof AppError) {
      return {
        ok: false,
        error: {
          code: exception.code,
          message: exception.message,
          retryable: exception.retryable,
          ...(exception.details ? { details: exception.details } : {}),
        },
      };
    }

    if (exception instanceof ZodValidationException) {
      // nestjs-zod types getZodError() as `unknown`; extract issues defensively.
      const zodError: unknown = exception.getZodError();
      const issues =
        zodError && typeof zodError === 'object' && 'issues' in zodError
          ? (zodError as { issues: unknown }).issues
          : undefined;
      return {
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'Request validation failed.',
          retryable: false,
          ...(issues ? { details: { issues } } : {}),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        ok: false,
        error: {
          code: status === 429 ? 'RATE_LIMITED' : 'INTERNAL',
          message: exception.message,
          retryable: status >= 500,
        },
      };
    }

    // Unknown error: log it backstage, but return a generic envelope to the client.
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : exception);
    return {
      ok: false,
      error: { code: 'INTERNAL', message: 'Internal server error.', retryable: true },
    };
  }
}
