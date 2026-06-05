import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ContentPolicy } from '@alias/contracts';
import { ContentPolicyService } from './content-policy.service';

@ApiTags('content-policy')
@Controller('v1/content-policy')
export class ContentPolicyController {
  constructor(private readonly service: ContentPolicyService) {}

  @Get(':locale')
  @ApiOperation({ summary: 'Fetch the OTA content policy for a word language.' })
  getPolicy(@Param('locale') locale: string): Promise<ContentPolicy> {
    // Available word languages are served dynamically by the backend, so we do NOT
    // validate against a static list here — the service resolves availability.
    return this.service.getPolicy(locale);
  }
}
