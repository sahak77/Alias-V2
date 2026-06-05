import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

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
  db = drizzle(pool, { schema });
  return db;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  db = undefined;
}
