import { Body, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { GenerationResponse } from '@alias/contracts';
import { AttestationGuard } from '../../common/guards/attestation.guard';
import { BudgetGuard } from '../../common/guards/budget.guard';
import { ContentGateInterceptor } from '../../common/interceptors/content-gate.interceptor';
import { GenerateDto } from './dto';
import { GenerationService } from './generation.service';

@ApiTags('generation')
@ApiBearerAuth()
@Controller('v1/generate')
@UseGuards(AttestationGuard, BudgetGuard)
@UseInterceptors(ContentGateInterceptor)
export class GenerationController {
  constructor(private readonly generation: GenerationService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a validated WordCard[] chunk (chunked, non-streaming).' })
  generate(@Body() body: GenerateDto): Promise<GenerationResponse> {
    return this.generation.generate(body);
  }
}
