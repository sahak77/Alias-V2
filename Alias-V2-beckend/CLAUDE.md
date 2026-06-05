# CLAUDE.md — Alias Backend (`/Alias-V2-beckend`)

Context and conventions for the **Alias backend**: a single **NestJS** service that supports the optional, network-only features of the Alias game. It lives in the `Alias-V2-beckend/` project folder (the `beckend` spelling is the real folder name — match it exactly). Read this with the workspace guide at [`../CLAUDE.md`](../CLAUDE.md) and the full rationale in [`backend-architecture.md`](backend-architecture.md) (in this folder). Keep this file short, current, and specific.

---

## The one rule that overrides everything

**The backend must NEVER gate gameplay.** The Alias core game is offline-first and pass-and-play; a full game must play in airplane mode on a fresh install with only the bundled starter pack. This backend exists *only* for optional v2/v3 features (AI pack generation, publishing, the public catalog, moderation, OTA content policy). It may only ever cause packs to be **written** into local device storage — it must never be on the critical path of a word draw, pack selection, or running game.

Practical consequences:
- Every backend failure mode (offline, rate-limited, budget-exhausted, attestation-failed, content-rejected) maps to a typed entry in the **shared error envelope** and surfaces in the app as a *soft* "AI temporarily unavailable, saved packs still work" — never a thrown error bubbling toward gameplay UI.
- If you can't say "a fresh install still plays in airplane mode with this change," stop.

---

## What this service is (and is not)

**Is:** the headline **AI word-pack generation proxy** — an anti-abuse-gated, budget-capped, structured-output endpoint that returns validated `WordCard[]` chunks. Plus OTA `ContentPolicy` delivery and the content gate.

**Is not (yet):** publishing, the public catalog/Discover, accounts/auth, and the moderation queue. **Their database tables exist now** (see [Database](#database)), but their **endpoints and feature logic are deferred seams** — do not build them until publishing is greenlit. Folders under `src/features/{accounts,catalog,moderation}` are intentionally empty placeholders.

---

## Tech stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Language | **TypeScript** (strict) | No `any`; `unknown` + narrow. Matches the client's TS 6 / Zod 4. |
| Runtime | **Node.js 24 LTS** | Always-on container (not serverless/edge) — clean abort propagation + OTel auto-instrumentation. |
| Framework | **NestJS 11** on **`@nestjs/platform-fastify`** | DI + guards/interceptors/filters now; batteries ready for the publishing platform. Express adapter is the only fallback. |
| Validation / DTOs | **`nestjs-zod`** (`createZodDto` + global `ZodValidationPipe`) | **Zod is the only DTO source.** Never add class-validator/class-transformer DTOs. |
| Shared contracts | **`@alias/contracts`** (Zod, at `../contracts`) | Single source of truth shared with the RN client. Server re-validates everything; it is a *shape* contract, not a security boundary. |
| API | **REST + OpenAPI 3.1** via **`@nestjs/swagger`** | Must stay legible to Apple/Google reviewers + DMCA tooling. |
| Database | **PostgreSQL 17** + **Drizzle ORM** + **drizzle-kit** | pg_trgm + per-locale `tsvector`. **No pgvector** until trigram demonstrably misses paraphrases. |
| Counters / limits | **Upstash Redis** (`@upstash/ratelimit`) | Spend cap + rate limits via **hard Lua reservation**, not post-hoc INCR. |
| LLM | **Anthropic Claude Haiku 4.5** behind a `Provider` interface | Forced structured output + per-chunk Zod re-validate + `tool_use` fallback. Swappable to Gemini Flash-Lite. |
| Anti-abuse | **App Attest / Play Integrity** behind a `Verifier` interface | Bounded soft-fail tier; hard-pass required for expensive paths (`count>50`, `withTaboo`). |
| Object storage | **Cloudflare R2** (S3-compatible) | Content-addressed `packs/{contentHash}.json.gz`; OTA policy JSON. |
| Jobs (deferred) | **pg-boss** on the same Postgres | Only when the catalog lands. |
| Auth (deferred) | **Better Auth** self-hosted | Owns its own auth tables; the app-domain `account` row links to it. |
| Logging | **`nestjs-pino`** | Structured; trace-correlated. |
| Tracing / errors | **OpenTelemetry** (OTLP) + **Sentry** + **Langfuse** | LLM-grade tracing. Backstage-only — never user-facing. |
| Testing | **Vitest 3** + Nest `Test.createTestingModule` / supertest + **PGlite** + **MSW** | Mocked LLM by default; gated nightly live-contract job. |
| Config | **`@nestjs/config`** + Zod (or `@t3-oss/env-core`) | Boot-time validation; a missing spend-cap var must fail loudly at startup. |

> Pin exact versions in `package.json`. `@expo/app-integrity` (client side) is alpha — pin a commit and keep a fallback.

---

## Commands

```bash
# from /Alias-V2-beckend
npm install

# Local stack (Postgres + pgweb)
docker compose up -d

# Develop (hot reload via Nest's SWC/tsx watcher)
npm run start:dev           # nest start --watch

# Database (Drizzle)
npm run db:generate         # drizzle-kit generate  (create SQL from schema changes)
npm run db:migrate          # apply migrations
npm run db:studio           # drizzle-kit studio (127.0.0.1:4983)
npm run db:seed             # content_policy + sample packs

# Quality gates — run all three before committing
npm run lint                # eslint (incl. the no-class-validator + import-boundary rules)
npm run typecheck           # tsc --noEmit
npm test                    # vitest

# E2E + live LLM (gated)
npm run test:e2e
RUN_LIVE_LLM=1 npm run test:llm   # nightly only, under a tiny spend cap
```

**Never `drizzle-kit push` against a shared environment.** Always `generate` + `migrate` so dev DBs don't diverge from the immutable-record schema.

---

## Project structure

See the annotated tree in [`backend-architecture.md` §5](backend-architecture.md). Summary:

- `src/main.ts` — bootstrap. **Import the OTel SDK first**, then Fastify adapter, global `ZodValidationPipe`, the error-envelope exception filter, and Swagger.
- `src/features/generation/` — the proxy: `controller` → `service` → `provider`/`content-gate`/`prompt`. **The only fully-built feature.**
- `src/features/content-policy/` — OTA `ContentPolicy` read path from R2.
- `src/features/{accounts,catalog,moderation}/` — **seams. Do not build.**
- `src/common/` — `guards/` (attestation, budget), `interceptors/` (content-gate), `filters/` (error envelope), pipes.
- `src/infra/` — `redis`, `r2`, `otel`, `logger`, `llm-client` (the one instrumented LLM wrapper — Langfuse spans live here), `normalize` (RN-safe, shared with the app), `queue` (seam).
- `src/db/` — Drizzle `schema/`, `migrations/`, `seed.ts`, `client.ts`. **Provisioned now.**

**Rule:** cross-cutting concerns are NestJS primitives — attestation/budget are **guards**, the content gate is an **interceptor**, the error envelope is an **exception filter**. Keep controllers thin; logic lives in services.

---

## Coding standards

- **Strict TypeScript**, no `any`. No `@ts-ignore` without a one-line reason.
- **Zod-only DTOs.** Import schemas from `@alias/contracts`, wrap with `createZodDto`. The global `ZodValidationPipe` validates every request. Never introduce class-validator DTOs (Nest's default examples use them — don't copy that).
- **The server re-validates everything.** The shared contract is a shape convention, not trust. The user `theme` is **untrusted data**: length cap ≤200, normalize (bidi/zero-width/control-char strip), pass as an XML-delimited DATA block under a fixed system prompt — never concatenate into instructions. Validate output (count, dedupe, substring-in-Taboo, per-locale blocklist).
- **Errors are the shared envelope.** Map every failure to a `@alias/contracts` error code; the exception filter renders it. No ad-hoc error shapes.
- **Files:** `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.guard.ts`, `*.interceptor.ts`, `*.filter.ts`. Named exports; one provider concern per file.
- **No business logic in controllers.** No secrets in code. No `console.log` — use the pino logger.

---

## The AI proxy — non-negotiables

- **Chunked, non-streaming for v2.** One POST returns a full validated `WordCard[]` chunk (~25 words); the client loops with an `AbortController` between calls. (Server-side streaming is a v3 item.)
- **Spend cap is admission control, not a counter.** Before each provider call, **atomically reserve projected-max-tokens** against the global monthly budget (Upstash `EVAL` Lua); reject if it would exceed; refund the delta after actual usage. Three synchronous pre-call tiers: per-token daily, per-IP daily, global monthly. Hard ceiling ~85–90%; OTel alerts at 70/90%. **Cap `count*1.5` server-side regardless of the client value.**
- **Attestation soft-fail is bounded.** Soft-failed tokens get an order-of-magnitude-smaller daily budget; **hard-pass required** for `count>50` and `withTaboo`.
- **Content-tier enforcement is deferred.** The `kids` tier + its COPPA flow are **removed**; tiers are `standard | adult`. When the deferred `adult` (18+) gate lands, the **server** enforces it (a server-verifiable adult-affirmation signal gates `adult` free-text `create`) — never trust a client-only flag.
- **BYO-key (decided): client-direct preferred** — the app calls the provider directly; the key never touches this server and is off our spend cap. If ever proxied, treat the key as a never-logged secret with a CI redaction assertion.

---

## Database

- **The full v2 schema is created now** (`account`, `published_pack`, `rating`, `install`, `report`, `moderation_verdict`, `content_policy`), but only the proxy/content-policy paths read it; mutating endpoints are deferred seams.
- Enforce at the DB level: `UNIQUE(publishedPackId, version)` and `UNIQUE(contentHash)` (integrity + global dedupe). JSONB for moderation verdicts; `text[]` for blocklists.
- Discover uses per-locale generated `tsvector` (correct `regconfig` per pack locale — en/es/fr/de/pt) + `pg_trgm`. Isolate all Discover queries behind one `search` repository module.
- Better Auth owns its own auth tables when auth lands; keep the app-domain `account` row linkable rather than duplicating identity columns.

---

## Security, secrets & observability

- **Redaction is the highest-risk item.** `theme`, the anonymous install token, and any BYO-key header must be dropped/hashed before any span/log export (OTel Collector redaction processor). **Disable Langfuse input-capture (or hash `theme`) from day one.** A **blocking CI fixture** asserts these never appear in exported spans/logs.
- Secrets via env only (validated at boot); never committed. `.env*` is git-ignored; `.env.example` documents required vars.
- Observability is **backstage-only** — these signals never surface to users. Global monthly spend + per-token rate-limit are first-class OTel metrics from day one.
- Local debugging: `pino-pretty` logs, OTel Collector `debug` exporter, `node --inspect`, Drizzle Studio + pgweb, Langfuse trace view as the replay/eval surface.

---

## Testing

- **Vitest** + Nest `Test.createTestingModule` / supertest e2e through the real pipeline (guards, pipes, filters).
- LLM is **mocked by default** (MSW, record/replay fixtures) so PRs cost $0. Live provider calls only in a gated nightly job under a tiny cap.
- DB tests use **PGlite** (in-process) or an ephemeral Compose Postgres.
- The redaction fixture test is **blocking**.

---

## Do NOT

- Put the backend on the critical path of gameplay, pack selection, or a word draw.
- Build the deferred seams (accounts/catalog/moderation endpoints) before publishing is greenlit.
- Add class-validator DTOs or derive wire contracts from Drizzle tables.
- Concatenate the untrusted `theme` into prompt instructions, or trust client-validated input without re-validating.
- Let `theme`/tokens/BYO-keys reach logs, spans, or Langfuse inputs.
- `drizzle-kit push` to a shared DB; commit secrets; leave `console.log`.
- Increment a spend counter *after* a call instead of reserving *before* it.
