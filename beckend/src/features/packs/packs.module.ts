import { Module } from '@nestjs/common';
import { PacksController } from './packs.controller';
import { PacksService } from './packs.service';

/**
 * Official-pack catalog READ (`GET /v1/packs`) — the v1 onboarding slice that serves
 * first-party official packs from `published_pack` (backend-architecture.md §4). The
 * community write side (publish / Discover / ratings / moderation) stays a deferred
 * seam under `src/features/catalog/` and is intentionally NOT built here.
 */
@Module({
  controllers: [PacksController],
  providers: [PacksService],
})
export class PacksModule {}
