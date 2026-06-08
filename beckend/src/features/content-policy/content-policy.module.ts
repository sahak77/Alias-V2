import { Module } from '@nestjs/common';
import { ContentPolicyController } from './content-policy.controller';
import { ContentPolicyService } from './content-policy.service';

/**
 * OTA ContentPolicy read path (R2 + CDN). The service is exported so the generation
 * content gate can read the per-locale blocklist it enforces.
 */
@Module({
  controllers: [ContentPolicyController],
  providers: [ContentPolicyService],
  exports: [ContentPolicyService],
})
export class ContentPolicyModule {}
