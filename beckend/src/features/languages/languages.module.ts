import { Module } from '@nestjs/common';
import { LanguagesController } from './languages.controller';
import { LanguagesService } from './languages.service';

/**
 * Dynamic word-language catalog read path (`GET /v1/languages`). Reads the `language`
 * table via the global DbModule; powers the app's first-run + change-language pickers.
 */
@Module({
  controllers: [LanguagesController],
  providers: [LanguagesService],
})
export class LanguagesModule {}
