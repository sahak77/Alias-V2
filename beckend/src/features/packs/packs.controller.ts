import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { PacksResponse } from '@alias/contracts';
import { PacksService } from './packs.service';

@ApiTags('packs')
@Controller('v1/packs')
export class PacksController {
  constructor(private readonly service: PacksService) {}

  @Get()
  @ApiOperation({ summary: 'List the first-party official packs (optionally by word language).' })
  @ApiQuery({ name: 'locale', required: false, description: 'BCP-47 word language to filter by.' })
  listPacks(@Query('locale') locale?: string): Promise<PacksResponse> {
    return this.service.listPacks(locale);
  }
}
