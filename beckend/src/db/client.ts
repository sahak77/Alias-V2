import { Logger } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const log = new Logger('DbPool');

/**
 * Drizzle client over a node-postgres pool. LAZY: the pool is created on first
 * access, not at import, and pg opens no connection until the first query — so the
 * app boots (and the firm-v2 proxy runs) with no DB connection. Only deferred
 * features will call this.
 */
let pool: Pool | undefined;
let db: NodePgDatabase<typeof schema> | undefined;

export function getDb(): NodePgDatabase<typeof schema> {
  if (db) return db;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // A Pool is an EventEmitter that emits 'error' on idle-client failures (DB restart,
  // network blip). With NO listener, Node treats it as an unhandled error and can
  // crash the process — log it instead; callers degrade on their own query errors.
  pool.on('error', (err) => log.error(`idle client error: ${String(err)}`));
  db = drizzle(pool, { schema });
  return db;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  db = undefined;
}
