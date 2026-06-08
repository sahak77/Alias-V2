import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { LanguagesResponse } from '@alias/contracts';
import { LanguagesService } from './languages.service';

@ApiTags('languages')
@Controller('v1/languages')
export class LanguagesController {
  constructor(private readonly service: LanguagesService) {}

  @Get()
  @ApiOperation({ summary: 'List the available word languages (dynamic catalog).' })
  getLanguages(): Promise<LanguagesResponse> {
    return this.service.getLanguages();
  }
}
