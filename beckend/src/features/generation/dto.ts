import { createZodDto } from 'nestjs-zod';
import { GenerationRequest, GenerationResponse } from '@alias/contracts';

/** Request DTO — the global ZodValidationPipe validates the body against this. */
export class GenerateDto extends createZodDto(GenerationRequest) {}

/** Response DTO — drives the Swagger success schema for the endpoint. */
export class GenerationResponseDto extends createZodDto(GenerationResponse) {}
