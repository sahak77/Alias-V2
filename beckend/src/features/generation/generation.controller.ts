import { Body, Controller, HttpCode, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { GenerationResponse } from '@alias/contracts';
import { AttestationGuard } from '../../common/guards/attestation.guard';
import { BudgetGuard } from '../../common/guards/budget.guard';
import { BudgetInterceptor } from '../../common/interceptors/budget.interceptor';
import { ContentGateInterceptor } from '../../common/interceptors/content-gate.interceptor';
import type { ProxyRequest } from '../../common/proxy-request';
import { GenerateDto } from './dto';
import { GenerationService } from './generation.service';

@ApiTags('generation')
@ApiBearerAuth()
@Controller('v1/generate')
@UseGuards(AttestationGuard, BudgetGuard)
// BudgetInterceptor is OUTERMOST so its refund-on-error wraps the content gate, the
// validation pipe, and the handler (everything after the reservation).
@UseInterceptors(BudgetInterceptor, ContentGateInterceptor)
export class GenerationController {
  constructor(private readonly generation: GenerationService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate a validated WordCard[] chunk (chunked, non-streaming).' })
  async generate(@Body() body: GenerateDto, @Req() req: ProxyRequest): Promise<GenerationResponse> {
    // Propagate a client disconnect to the in-flight provider call. (The client also
    // loops with its own AbortController BETWEEN chunks — this covers the open chunk.)
    const ac = new AbortController();
    const onClose = (): void => ac.abort();
    req.raw.once('close', onClose);
    try {
      return await this.generation.generate(body, { reservation: req.budget, signal: ac.signal });
    } finally {
      req.raw.removeListener('close', onClose);
    }
  }
}
