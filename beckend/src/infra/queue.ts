/**
 * Background-jobs seam — pg-boss on the same Postgres (transactional enqueue of
 * publish + moderation-scan; built-in cron). Wired only when the catalog lands;
 * NOT started this pass.
 */
export interface JobQueue {
  start(): Promise<void>;
  publish(name: string, data: unknown): Promise<void>;
  stop(): Promise<void>;
}

// TODO(catalog): implement with pg-boss against DATABASE_URL.
