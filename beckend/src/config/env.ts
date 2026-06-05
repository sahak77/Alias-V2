import { z } from 'zod';

/**
 * Boot-time environment validation. A missing/invalid required var MUST fail loudly
 * at startup (see app.module.ts `ConfigModule.forRoot({ validate })`). Optional infra
 * vars are validated-if-present so the app boots with NO network on a fresh install.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Required: the one hard dependency declared at boot.
  DATABASE_URL: z.string().min(1),

  // Upstash Redis (optional until the generation proxy lands).
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Cloudflare R2 (optional until the content-policy read path lands).
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.url().optional(),

  // LLM provider (optional until the generation proxy lands).
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('claude-haiku-4-5'),
  LLM_MONTHLY_BUDGET: z.coerce.number().nonnegative().default(50),

  // Observability (optional; backstage-only — never user-facing).
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  SENTRY_DSN: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_BASEURL: z.url().default('https://cloud.langfuse.com'),

  // Gates the nightly live-LLM contract test. Parsed explicitly to avoid the
  // `coerce.boolean()` footgun where "0" would coerce to `true`.
  RUN_LIVE_LLM: z
    .enum(['0', '1', 'true', 'false'])
    .default('false')
    .transform((v) => v === '1' || v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

/** `@nestjs/config` validate hook. Throws -> Nest aborts boot with a clear message. */
export function validate(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
