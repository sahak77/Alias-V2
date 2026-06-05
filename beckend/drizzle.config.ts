import { defineConfig } from 'drizzle-kit';

// Drizzle tooling is provisioned now; the schema is intentionally empty this
// pass (no tables yet — see src/db/schema/index.ts). Never `drizzle-kit push`
// to a shared DB: use `generate` + `migrate` so dev DBs don't diverge.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://alias:alias@localhost:5432/alias',
  },
  verbose: true,
  strict: true,
});
