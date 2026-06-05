import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  /** Liveness probe — Railway healthcheck target (railway.json `healthcheckPath`). */
  @Get('health')
  @ApiOkResponse({ description: 'Service is up.' })
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
