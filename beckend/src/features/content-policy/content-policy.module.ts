import { Module } from '@nestjs/common';
import { ContentPolicyController } from './content-policy.controller';
import { ContentPolicyService } from './content-policy.service';

/**
 * OTA ContentPolicy read path (R2 + CDN). Wired with a stub body returning the
 * NOT_IMPLEMENTED envelope until the R2 read/cache/validate logic lands.
 */
@Module({
  controllers: [ContentPolicyController],
  providers: [ContentPolicyService],
})
export class ContentPolicyModule {}
