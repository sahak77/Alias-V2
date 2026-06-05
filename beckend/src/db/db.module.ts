import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { closeDb, getDb } from './client';

/** DI token for the Drizzle client. */
export const DB = Symbol('DB');

/**
 * Provides the (lazy) Drizzle client for deferred features. Resolving the token
 * creates the pool object but opens no connection — pg connects on first query.
 */
@Global()
@Module({
  providers: [{ provide: DB, useFactory: () => getDb() }],
  exports: [DB],
})
export class DbModule implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await closeDb();
  }
}
