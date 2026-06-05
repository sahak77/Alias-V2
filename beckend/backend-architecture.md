# Alias Backend — Tool & Tech Recommendation (v2)

**Audience:** senior backend dev acting on this directly.
**Goal:** a lean, coherent *initial* backend that (a) never gates offline gameplay, (b) lands the AI word-pack proxy as the firmly-scoped headline, (c) leaves clean seams for catalog/accounts/moderation/multiplayer, and (d) shares one Zod source of truth with the existing RN client.

> Produced by a multi-agent research workflow (11 concern dimensions × live web research, 3 adversarial critiques, 1 synthesis), then narrowed by the locked decisions below. The single most important correction over the raw per-dimension research: the dimensions disagreed on runtime/host and on what is actually v2. Both are resolved below — one runtime (**Node + NestJS on the Fastify adapter, on Railway**), and a much smaller firm-v2 *feature* scope (proxy + content gate + OTA policy + observability); everything whose only consumer is *publishing* defers behind seams.

> ### Locked decisions (2026-06-03)
> 1. **Framework = NestJS** on `@nestjs/platform-fastify`. Chosen for team familiarity and because the deferred publishing platform (CRUD/RBAC/admin/queues/moderation) is NestJS's sweet spot — one framework runs end-to-end with no later migration. The firm-v2 proxy accepts a little extra ceremony as the price. Zod stays the single contract source via `nestjs-zod` (`createZodDto` + `ZodValidationPipe`); **no class-validator DTOs**.
> 2. **Database = the full Postgres 17 + Drizzle v2 schema is provisioned now** (accounts, published packs, ratings/installs, reports, moderation verdicts, content policy) with `drizzle-kit` migrations + Drizzle Studio — front-loading the data model per the explicit "db setup" goal. The *feature logic/endpoints* that mutate most of those tables stay deferred behind seams; the schema exists so the model is reviewed and stable from day one.
> 3. **Layout = a single git monorepo under the workspace root: `application/` (Expo app) + `beckend/` (NestJS) as sibling project folders, plus `packages/contracts/` (shared Zod, planned).** Plain folders, not npm-workspaces tooling; `packages/contracts/` is shared by relative-path import (`../packages/contracts`). Each project owns its `CLAUDE.md`; the repo root `CLAUDE.md` is the workspace guide. Formalize npm-workspaces only if publishing nears.

> ### Implementation status (2026-06-04) — initial scaffold landed
> The initial template/architecture below is **scaffolded and verified**: `typecheck` + `lint` + SWC `build` + Vitest e2e (boots the real Nest pipeline) + a boot smoke-test all pass; the app boots with **zero outbound connections** (offline-first invariant verified). Deltas from the plan above, so the doc matches the code:
> - **`packages/contracts/` is scaffolded** (no longer "planned"): a **tsup-built** `@alias/contracts` package (dual ESM/CJS + `.d.ts`), consumed by the backend via `"@alias/contracts": "file:../packages/contracts"`. `zod` is a **peer dependency** so app/contracts/server share one Zod 4 runtime. Schemas shipped: the error envelope, `GenerationRequest`/`WordCard`/`AiMeta`/`GenerationResponse`, `ContentPolicy`, `Pack`, `Locale`. The RN-safe import-boundary is enforced by ESLint (`no-restricted-imports`) + `"types": []`. The backend resolves the package purely through the `file:` symlink (no tsconfig `paths` overlay needed); run `packages/contracts`' `tsup --watch` to keep `dist` fresh during development.
> - **Build = SWC** (Nest's SWC builder); `tsc` is used for `--noEmit` typecheck only. This **resolves the "TS 6 × Nest decorators" risk** (§6): SWC emits decorator metadata, so TypeScript **6.0.3** (matching the app) is used everywhere with no metadata concern. `.swcrc` mirrors `experimentalDecorators` + `emitDecoratorMetadata`; Vitest uses `unplugin-swc` (with Vitest 4's Oxc transformer disabled). **`nest start --watch`** additionally needs **`chokidar`** (an *optional* peer of `@swc/cli` — npm skips it by default, so it's pinned as a devDep, else `start:dev` throws "Cannot find module 'chokidar'").
> - **Validation + Swagger:** `nestjs-zod@5` — global `ZodValidationPipe` via `APP_PIPE`, error-envelope filter via `APP_FILTER` (so the e2e test and the app share the same pipeline). nestjs-zod 5 **replaced `patchNestJsSwagger` with `cleanupOpenApiDoc()`** (called after `createDocument`); the OpenAPI document is stamped **3.1**. Swagger UI under the Fastify adapter requires **`@fastify/static`** (added as a runtime dep), else `/docs` setup aborts bootstrap.
> - **Env validation:** `@nestjs/config` + a Zod `validate()` callback (chosen over `@t3-oss/env-core`). Missing `DATABASE_URL` fails boot loudly; all infra vars are optional/validated-if-present so a fresh, offline boot makes no network calls.
> - **Wired now:** `GenerationModule` (`POST /v1/generate`) + `ContentPolicyModule` (`GET /v1/content-policy/:locale`) with **stub service bodies returning the `NOT_IMPLEMENTED` envelope**; the **error-envelope exception filter is real**; attestation/budget **guards** + content-gate **interceptor** are pass-through skeletons (interfaces defined); a `GET /health` route backs the Railway healthcheck. Infra clients (Redis/R2/LLM) are lazy/env-gated stubs; `infra/normalize.ts` is real (RN-safe). Seams `accounts`/`catalog`/`moderation` are empty `.gitkeep` placeholders, not imported.
> - **Database = TOOLING ONLY this pass (no tables).** This is the **one deliberate deviation** from decision 2 / §2 / §D7 / §4 below (which say "provisioned now"), per the agreed scope ("no tables yet"): Drizzle + drizzle-kit + a **lazy** `pg` client + docker-compose Postgres + an **empty schema barrel** + a `seed.ts` stub are in place, and `npm run db:generate` runs (reports `0 tables`). Authoring the full v2 schema (`account`, `published_pack`, `rating`, `install`, `report`, `moderation_verdict`, `content_policy`) is the **immediate next pass**.
> - **Error codes** extend the §4 set with `INTERNAL` + `NOT_IMPLEMENTED`.
> - **Pinned versions (exact):** NestJS 11.1.24 (Fastify adapter), nestjs-zod 5.4.0, zod 4.4.3, Drizzle 0.45.2 / drizzle-kit 0.31.10, pg 8.21.0, @upstash/ratelimit 2.0.8 + redis 1.38.0, @aws-sdk/client-s3 3.1061.0, @anthropic-ai/sdk 0.100.1, OTel set (sdk-node 0.218.0 + exporter-trace-otlp-http 0.218.0 + api 1.9.1 + resources 2.7.1 + semconv 1.41.1), nestjs-pino 4.6.1 / pino 9.14.0, @sentry/node 9.47.1, @fastify/static 8.3.0, Vitest **4.1.8** (the §1 table said "Vitest 3" — 4.x is the current GA), TypeScript 6.0.3, `@types/node` 24.x, Node 24 (`engines` + `.nvmrc`). pino 9 / Sentry 9 are pinned per the §1 wording even though 10.x exists.
> - **Not built (correctly deferred):** real provider/LLM calls, the spend-cap Lua reservation, attestation verification, content-gate enforcement, R2 reads, OTel exporters wired to a backend, and all seam features.

> ### Spec reconciliation (2026-06-04) — product decisions folded in
> The doc body below still reflects the original plan in places; **these decisions win** where they conflict:
> - **Content tiers = `standard | adult` (18+). The `kids` tier and its COPPA gate are REMOVED**, and content-filter *enforcement* is **deferred to a later phase** (not firm-v2). The contract keeps the `standard | adult` keys on `GenerationRequest.contentFilter` (default `standard`); the content gate stays a stub. Wherever this doc says "kids" / "strict-kids" / "COPPA" below, read it as the deferred **adult/18+ tier**.
> - **Word languages are DYNAMIC (server-driven).** The available word-language list is served by the backend (new languages added in the DB / a future admin panel appear automatically), so the `Locale` contract is now an **open BCP-47 string**, not a closed enum. A read-only **languages-catalog endpoint** (e.g. `GET /v1/languages`) is a **named seam** — do not build it yet. The per-locale Discover `tsvector` regconfig (§D7) is therefore chosen **per pack locale at write time**, not from a fixed set.
> - **Pack model — bundled *starter* + server-driven *official* catalog.** The standard play words are **packs**, not loose words. A small **starter pack** (default launch language) is bundled in the app binary as the offline safety net; the **full standard catalog** (all languages + themes) is **server-driven**, delivered as first-party *"official"* packs through the **same `published_pack` + catalog + R2 path** as community packs. First launch lets the user pick ≥1 pack and **downloads** it; a fresh airplane-mode install still plays via the starter. So the catalog's *read*/download path is a **v1 onboarding** concern, while community publish/ratings/moderation stay deferred. (client/device `source`: `builtin` starter · `downloaded` official/community · `custom`/`ai` local · `imported` QR/file; the server `published_pack.source` enum is just `builtin`/`custom`/`ai`.)
> - **App (UI) language ≠ word language.** The app UI language is the **bundled i18n launch set** (`LAUNCH_LOCALES` = en/es/fr/de/pt, expandable, lazy-loaded) — a client/Settings concern the backend is not involved in. Only *word* languages are server-driven.
> - **Game-rule decisions** (mobile spec; no backend impact): negative scores allowed; tie-break = repeated sudden-death until a winner (no draw); Max-Score fairness "finish the rotation" = default true; teams stay team-level only for v1.
> - **`packages/contracts/` already updated accordingly:** `Locale` = open BCP-47 string + `LAUNCH_LOCALES`; `ContentFilter` = `standard | adult`; `ContentPolicy` dropped `allowedKidsCategories`. Backend `content-policy` controller no longer statically validates the locale (the catalog is dynamic).

---

## 1. TL;DR stack

| Concern | Recommended | Version | One-line why |
|---|---|---|---|
| Language / runtime | **Node.js 24 LTS** | 24.x LTS | Full npm compat (attestation libs, LLM SDKs, OTel auto-instrument); 30-mo support; no exotic-runtime risk. |
| HTTP framework | **NestJS** on `@nestjs/platform-fastify` | Nest 11.x | One framework end-to-end: thin DI/guards/interceptors now, batteries (swagger, queues, ws, passport) ready when the publishing platform lands. Fastify engine keeps proxy throughput + raw `AbortSignal`. |
| Host (compute) | **Railway** always-on container | `railway.json` | Persistent process = zero cold start + clean client-abort propagation; best solo DX; private-net Postgres. |
| API paradigm | **REST + OpenAPI 3.1** via `@nestjs/swagger`, contract-first with Zod | OpenAPI 3.1 | Public UGC + AI platform must be legible to Apple/Google reviewers & DMCA tooling; existing client is already REST-shaped. |
| Shared types | **One hand-written `@alias/contracts` Zod package** (`nestjs-zod` on the server) | Zod 4.x | Single source of truth; `z.infer` to the RN client, `createZodDto` + `ZodValidationPipe` on the server — **not** class-validator DTOs. Zero codegen, zero drift. |
| LLM provider | **Anthropic Claude Haiku 4.5** (native Structured Outputs) behind a `Provider` interface | Haiku 4.5 | Strong native es/fr/de/pt, ~1/5 Sonnet cost, grammar-constrained JSON; one-file swappable to Gemini Flash-Lite if spend-cap binds. |
| AI structured output | `output_format: json_schema` + **per-chunk Zod re-validate** | GA | Model guarantee is not your parser; forced-`tool_use` fallback on 400. |
| Counters (rate limit + spend cap) | **Upstash Redis** (HTTP) | `@upstash/ratelimit` 2.x | Atomic limits over HTTP (no TCP pool); portable if proxy ever moves; **hard reservation via Lua**, not post-hoc INCR. |
| Anti-abuse | **App Attest (iOS)** + **Play Integrity (Android)** server-verified | `@expo/app-integrity` (alpha — pin exact) | Free-minted tokens can't drain budget; behind a `Verifier` interface with a *bounded* soft-fail tier. |
| Object storage / CDN | **Cloudflare R2** + CDN (content-addressed blobs + OTA policy JSON) | R2 GA | Zero egress on the install-dominated path; `packs/{contentHash}.json.gz` = free dedupe + free immutability. |
| Database (**provisioned now**) | **PostgreSQL 17** + **Drizzle ORM** + drizzle-kit + pg_trgm + per-locale `tsvector` | PG17, Drizzle ~0.4x | One boring debuggable engine; the full v2 schema is created now (per the db-setup decision); **no pgvector at first**. |
| Background jobs (when catalog lands) | **pg-boss** on the same Postgres | 12.x | Transactional enqueue (publish + moderation-scan in one commit), built-in cron, zero extra infra. |
| Auth (when publishing lands) | **Better Auth** self-hosted on the same Postgres | 1.6.x (pinned) | Own the single PII surface, no per-MAU fee, account↔pack FKs for repeat-infringer enforcement, one delete cascade. |
| Moderation classifier (when catalog lands) | **OpenAI `omni-moderation-latest`** first-line + LLM-classifier escalation for the adult tier | — | Free on a key you'd already hold; fail-CLOSED; escalate sensitive/adult content to a stricter gate. |
| Observability | **OpenTelemetry (OTLP)** spine → **pino 9** + **Sentry 9** + **Langfuse** | OTel 2.x | One wire format, swappable backend; LLM-grade tracing for the headline feature; backstage-only (never user-facing). |
| Local dev | **Docker Compose** (Postgres 17 + mock-LLM) + **tsx watch** + `@t3-oss/env-core` + Drizzle Studio | tsx ^4 | Sub-2-min first run in airplane mode; boot-time env validation so a missing spend-cap var fails loudly. |
| Backend tests | **Vitest 3** + Nest `Test.createTestingModule` / supertest on `app.getHttpServer()` + **PGlite** + **MSW** | Vitest 3.x, MSW 2.x | Right runner for the ESM/TS6/Zod4 server; e2e through the real Nest pipeline; $0/PR (mocked LLM); gated nightly live-contract job. |

**The shape of it.** A single always-on Node 24 + NestJS (Fastify adapter) service on Railway is the entire v2 backend. Its hot path is two-plus counters in Upstash Redis (per-token daily, per-IP daily, global monthly spend) guarding one headline capability: an anti-abuse-gated, budget-capped, structured-output **AI word-pack generation proxy** that returns validated `WordCard[]` chunks the client writes into its own local corpus. The app's content gate (per-locale blocklist + output re-scan) reads an **OTA `ContentPolicy`** JSON served from Cloudflare R2 + CDN. Wire shapes live in a single `@alias/contracts` Zod package the RN app's already-built `apiClient` consumes for types. **Per the locked DB decision, the full Postgres 17 + Drizzle v2 schema is provisioned now** (accounts, published packs, ratings/installs, reports, moderation verdicts, content policy) — but **pg-boss, Better Auth, the moderation queue, and the publish/Discover endpoints remain *named seams*, not built feature code** — they light up incrementally inside the *same* Nest app when publishing is greenlit, with no re-platforming. The backend is connectionless-to-gameplay and write-only into local storage; it can be entirely dark and a fresh install still plays in airplane mode.

---

## 2. Key architectural decisions

### D1. One runtime, one host: NestJS on Node 24 (Fastify adapter), always-on Railway container — for *everything*
- *Why an always-on container, not serverless/edge:* the headline feature is cancelable chunked generation that mostly **waits on the LLM** and must propagate client aborts upstream to stop burning budget. A persistent Node process does this cleanly; serverless/edge fights it (execution limits, abort plumbing) and would split spend-cap/attestation enforcement across execution models — unacceptable for the highest-risk path. Node also unlocks `@opentelemetry/auto-instrumentations-node` (free HTTP/Postgres/Redis spans) — see D6.
- *Why the Fastify adapter (`@nestjs/platform-fastify`), not Express:* better throughput, native access to the raw request/`AbortSignal` the proxy needs, and JSON-schema-first validation that pairs cleanly with the Zod contract. (The Express adapter remains a drop-in fallback if a required middleware is Express-only.)
- *Trade-off accepted:* ~$5–15/mo for idle compute **plus** a little NestJS ceremony around a currently-thin surface — both bought back the moment the publishing platform lands, where Nest's structure/ecosystem amortize, and idle compute buys zero cold-start latency + clean abort semantics (dwarfed by capped LLM token spend).

### D2. Type sharing: ONE hand-written `@alias/contracts` Zod package. Not codegen, not RPC, not drizzle-zod-as-source.
- DB shape ≠ wire shape, so **do not** derive wire contracts from Drizzle tables.
- On the server, consume the `@alias/contracts` Zod schemas via `nestjs-zod`'s `createZodDto` + a global `ZodValidationPipe` — **do not** introduce class-validator/class-transformer DTOs as a parallel source of truth (Nest's default examples use them; this forks the contract). The wire shape has exactly one home.
- The RN app keeps its **existing** `src/lib/apiClient.ts` + per-feature TanStack Query hooks (pattern in `useLogin.ts`) and imports `@alias/contracts` for `z.infer` types only.
- *Monorepo decision (a genuine fork — see §6):* `/beckend` + relative import for the firm-v2 cut, OR a one-time workspace conversion (`apps/mobile`, `apps/api`, `packages/contracts`) if publishing is near. Whoever does it owns the repo-wide migration (workspaces, EAS build paths, `expo-router/entry` main field, CI). Add a CI guard asserting client and server resolve the **same** `@alias/contracts` version.
- *Trade-off:* contracts is the *shape* contract, **not a security boundary** — the server re-validates everything (the `theme` string is untrusted data: length cap ≤200, content gate, prompt-injection-as-data).

### D3. The offline-first seam is enforced at the *client* boundary; the backend is connectionless-to-gameplay and write-only
- The backend never holds a connection gameplay depends on and never gates a word draw. Attestation / rate-limit / budget / network failures surface as a **soft** "AI temporarily unavailable, saved packs still work" — never a thrown error bubbling toward gameplay UI.
- **Correction to the research:** the corpus is a JSON blob in AsyncStorage/MMKV today (`expo-sqlite`/`expo-file-system` are *not* installed; SQLite is a future client tier). The **client** owns `install = download → sha256-verify → persist → only then mark playable`.
- **Concrete boundary hardening:** the existing client defaults `apiUrl` to `https://api.example.com` and `fetch`es unconditionally — on a fresh airplane-mode install any `apiClient` call *throws a network error*, not a typed soft state. **Extend the shared error envelope** with a first-class `OFFLINE`/`NETWORK_UNAVAILABLE` code; wrap `apiClient` to normalize `fetch` rejections into it; every optional-feature call site treats it as soft. This is the code-level enforcement of "never gates gameplay."

### D4. The AI proxy: stateless, chunked (not streamed) for v2, spend-capped by *hard reservation*, gated by attestation
- **Generation is non-streaming-chunked for v2.** The existing `apiClient` is JSON-only with no stream reader / per-chunk AbortSignal. Lowest-risk path: **one POST returns a full validated `WordCard[]` chunk (~25 words); the client loops calls with an `AbortController` between calls** (Cancel works at call boundaries). Server-side streaming UX is a v3 item with a real-device gate.
- **Spend cap is admission control, not a counter.** Before each provider call, **atomically reserve projected-max-tokens** against the global budget (Upstash `EVAL` Lua, or Postgres `SELECT … FOR UPDATE` on a single budget row once a DB exists); reject if it would exceed; refund the delta after actual usage. **Three tiers, all synchronous pre-call:** per-token daily, per-IP daily, global monthly. Hard ceiling at ~85–90%; OTel alerts at 70/90%. **Cap `count*1.5` server-side regardless of client value.**
- **Attestation soft-fail is a bounded backdoor, not a free pass.** Soft-failed token gets a per-day budget an order of magnitude below an attested one; require **hard-pass** for expensive paths (`count>50`, `withTaboo`); alert on soft-fail spikes (= attack).
- **Prompt-injection posture:** untrusted `theme` is never concatenated into instructions — passed as an XML-delimited DATA block under a fixed system prompt; normalized before send (length cap, bidi/zero-width strip, control-char strip); validated after (count, dedupe, substring-in-Taboo, per-locale blocklist).
- **Content gate ABOVE the model:** normalizer + per-locale blocklist + output re-scan, reading the OTA `ContentPolicy` (a locale with no policy ⇒ empty blocklist, i.e. permissive; the normalizer still runs). Content-*tier* enforcement (the `adult`/18+ gate) is **deferred** per the reconciliation note; the blocklist/normalizer gate is the firm part. A few hundred lines.
- **Content-tier gate (deferred).** The `kids` tier and its COPPA flow are removed; tiers are `standard | adult`. When the deferred adult (18+) gate lands, the **server** enforces it (a client-only flag is trivially bypassable) — a server-verifiable adult-affirmation signal gates `adult` free-text `create`.
- **BYO-key transport — decide explicitly.** **Strongly prefer client-direct** (key never touches your server; off your spend cap/attestation). If BYO must proxy (to run the content gate), treat the key as a never-logged secret: redact in the OTel Collector, never persist/attach to a span; CI fixture asserting it never appears in any exported span/log.

### D5. Storage: Cloudflare R2 + CDN for immutable content-addressed blobs and OTA policy
- Key layout `packs/{contentHash}.json.gz` → identical content = identical key = **free global dedupe + immutable blobs**; an edit yields a new hash = a new blob, so a device's already-downloaded copy never breaks. `Cache-Control: public, max-age=31536000, immutable`.
- **Dynamic data (search/sort, installCount, ratingAvg, reportCount, moderation status) is API+DB, never served from immutable CDN objects.**
- OTA `ContentPolicy`: `policy/{locale}/v{N}.json` (immutable) + a tiny mutable `policy/{locale}/latest.json` pointer (short-TTL, stale-while-revalidate). Patch the blocklist without an app-store release.
- *Known footgun to test:* R2 doesn't reliably persist `Content-Encoding` via the binding — decide once (store raw + stamp `gzip`, or store pre-gzipped + stamp header) and bake an integration test that downloads through the CDN and asserts byte-for-byte decode to the expected `contentHash`.
- *Trade-off:* immutability is convention (content-addressed keys, never overwrite). Legal/takedown evidence lives in the moderation DB, not the blob store.

### D6. Build-vs-buy for auth: **buy the library, own the data** — Better Auth self-hosted (when publishing lands)
- Why not Clerk/Auth0/Supabase-as-whole: avoid per-MAU fees and an off-box PII silo for a feature most users never touch; keep `account ↔ PublishedPackRecord ↔ repeat-infringer` as plain FKs in one DB with one transactional delete cascade.
- **Reconcile the token mechanism before writing any auth UI.** The existing client uses a hand-rolled Bearer at `STORAGE_KEYS.authToken`; `@better-auth/expo` manages its own secure-store session. **Pick one** — preferred: adopt `@better-auth/expo` and retire the manual path; simpler: keep the manual path and have Better Auth issue a plain bearer.
- **Delete-account must distinguish "erase PII" from "retain takedown evidence."** `beforeDelete`/`afterDelete` cascade anonymizes attribution while an **append-only** moderation/takedown table retains the repeat-infringer/legal record. Transactional email (Resend/SES with SPF/DKIM/DMARC) is a **launch gate**, not polish.
- Put the same attestation gate in front of sign-up to stop mass-account-creation for repeat-infringer evasion.
- **The app-domain `account` carries publishing state beyond identity:** a `role` (`user` / `official` / `admin`) — `official` marks the first-party publisher whose uploads stamp `published_pack.source = builtin` (and badge official); `admin` = moderation staff (→ `moderation_verdict.reviewer_id`) — and an `account_status` (`active` / `suspended` / `deleted`), where **`suspended`** is the repeat-infringer / DMCA enforcement handle (a fast pre-publish check complementing the append-only evidence table). The public `nickname` is a **non-unique** display name; stable identity is `id` / `publisher_key_id`. (See db-architecture.md §5.1.)

### D7. Database — Postgres 17 + Drizzle, **provisioned now**, **no pgvector at first**
- **Locked: the full v2 schema is created now** (per the explicit db-setup goal) — `account`/creator, `published_pack`, `rating`, `install`, `report`, `moderation_verdict`, `content_policy` — with `drizzle-kit` migrations and Drizzle Studio, even though the firm-v2 proxy only reads `content_policy` (and writes nothing relational; budget counters live in Redis). The *endpoints/flows* that mutate the rest (publish, ratings, reports, auth) stay deferred behind seams; the tables exist so the data model is reviewed and stable from day one. **Note:** Better Auth owns its own auth tables (user/session/verification), generated when auth is wired — keep the app-domain `account`/creator row linkable to it rather than duplicating identity columns.
- One boring engine for accounts, the **mutable one-row-per-pack** `published_pack` (an edit bumps `content_hash` + `updated_at` and re-enters moderation; `content_hash` is an integrity/dedupe **index, not a uniqueness constraint** — no version history), JSONB moderation verdicts, `text[]` blocklists, counters, and Discover (per-locale generated `tsvector` with the correct `regconfig`, chosen **per pack locale at write time** since word languages are dynamic — the launch-reviewed set is en/es/fr/de/pt — plus `pg_trgm` fuzzy and a GIN index on `tags text[]` for tag filters).
- **Defer pgvector** — `pg_trgm` handles the "Harry Poter" case at zero marginal cost. Adopt pgvector only when trigram/string matching *demonstrably* misses paraphrases.
- *Trade-off:* per-locale `tsvector` regconfig must be chosen by pack locale from the first migration. Isolate all Discover queries behind one `search` repository module (a future swap to pgroonga/Typesense for CJK touches one file).

### D8. Moderation pipeline: defer the queue/watchlist/admin-panel; keep the `moderatePack()` seam; fail CLOSED
- Firm v2 already covered by D4's content gate (the proxy's *own* output). The full pipeline lands with the catalog behind a single `async moderatePack(pack): Promise<ModerationVerdict>` returning the Zod-typed `PublishedPackRecord.moderation` shape.
- Invariants to lock now: **fail-CLOSED** (pack stays `pending`/`held` if classifier unavailable); **one shared normalizer** used on *both* device and server so the on-device gate and publish gate agree and `contentHash` never drifts; **salted one-way per-pack-HMAC device hashes** (`reporterDeviceHash`, `raterDeviceHash`, and the install hash — so a device's reports/ratings/installs aren't linkable across packs). Sensitive/adult content routes through the stricter LLM-classifier escalation. In-app **`report`** rows are an anonymous triage signal — crossing a `report_count` threshold (lower for `ip`/`adult`) auto-flips a pack to `held`; the **formal DMCA** notice channel (identifiable complainant via the in-app DMCA link) is separate and routes to takedown evidence. The report→takedown queue needs a **staffed human + documented SLA** before the catalog ships (Apple 1.2). **Re-moderate on edit:** published content is mutable (no version history), so any content edit changes `contentHash` and resets the pack to `pending` for a re-scan — the verdict stores the approved hash, so live-hash drift ⇒ unreviewed (an `official`/trusted account may auto-pass).

---

## 3. Modern debugging & observability toolkit

The headline backend *is* an LLM proxy, so LLM-grade tracing is the center of gravity. One **OTLP** wire format, swappable backend, backstage-only (these signals never surface to the user).

**Production observability**
- **OpenTelemetry JS SDK 2.x** spine. Run on **Node (not edge)** so `@opentelemetry/auto-instrumentations-node` gives free HTTP/Postgres/Redis spans.
- **pino 9** structured logs; OTel pino instrumentation stamps every line with `trace_id`/`span_id` for one-click pivot from a slow span to its logs.
- **Sentry 9** (already on the RN client; OTel-under-the-hood) for errors + release health — one W3C `traceparent` trace from an app tap through the proxy.
- **Langfuse** (Cloud free tier for v2) for LLM-call tracing: per-chunk span trees, token/cost, structured-output validity, prompt versioning across `create`/`expand`/`replaceWord` + the Taboo pass. OTel-native, merges into the same trace.
- **OTel Collector as the redaction chokepoint** — the **single highest-risk item**: drop/hash `theme`, the anon install token, and any BYO-key header before export. **Disable Langfuse input-capture (or hash `theme`) from day one** (defaults ON). **Blocking CI fixture** asserting raw `theme`/token/BYO-key never appear in any exported span/log. **Tail-based sampling before launch** (100% of errors/holds/rejects, downsample healthy generations).
- **Global monthly spend** and **per-token rate-limit** are first-class OTel metrics from day one; alert at 70/90%.

**Local DX**
- `pino-pretty` for readable dev logs; OTel Collector `debug` exporter to eyeball spans locally.
- **Drizzle Studio** (`127.0.0.1:4983`) for app-shaped DB browsing; **pgweb/Adminer** Compose service for raw SQL/`EXPLAIN`.
- `node --inspect` / `--inspect-brk` breakpoints; Vitest `--inspect-brk` + VS Code.
- **Langfuse trace view as the "request replay"/eval surface** — datasets to replay a theme through `create`/`expand`/`replaceWord` and red-team the content gate.

**Don't:** adopt Helicone (Mintlify-acquired Mar 2026 → roadmap risk; extra proxy hop). Don't self-host Langfuse for v2 (ClickHouse won't co-locate on the small Railway box).

---

## 4. What to build NOW vs defer

**Build now (foundation + wired stubs — the architecture, the DB, the debugging toolkit):**
1. The single NestJS (Fastify adapter) app on Node 24 + Railway deploy (`railway.json`, GitHub Actions CI); root `app.module.ts`; global `ZodValidationPipe` + error-envelope exception filter.
2. `@alias/contracts` Zod package: `GenerationRequest`, `WordCard`, `ContentPolicy`, and the **shared error envelope** (`OFFLINE`/`NETWORK_UNAVAILABLE`, `RATE_LIMITED`, `BUDGET_EXHAUSTED`, `ATTESTATION_FAILED`, `CONTENT_REJECTED`, `IP_WATCHLIST`, `VALIDATION`). Pure schemas + types, **no server-only imports** — enforced with an import-boundary lint rule.
3. **Postgres 17 + Drizzle (db-setup decision):** the full v2 schema + `drizzle-kit` migrations + Drizzle Studio + a Docker Compose Postgres + a seed for `content_policy`/sample packs. Tables exist; mutating endpoints stay stubbed.
4. **AI generation proxy:** `generation` module (controller/service) — chunked non-streaming POST → validated `WordCard[]`; `Provider` interface (Haiku 4.5 first); forced structured output + per-chunk Zod re-validate + `tool_use` fallback. *(Heavy provider logic may ship as a typed stub initially — no API key required to stand the app up.)*
5. **Three-tier hard-reservation spend cap + rate limits** as a `budget.guard.ts` over Upstash Redis (Lua reservation); `count*1.5` capped server-side.
6. **Attestation** as an `attestation.guard.ts` behind a `Verifier` interface with a *bounded* soft-fail tier; hard-pass for expensive paths (`count>50`, `withTaboo`).
7. **Content gate** (normalizer + per-locale blocklist + output re-scan) as a `content-gate.interceptor.ts` reading OTA `ContentPolicy` from R2. (Content-*tier* enforcement — the `adult`/18+ gate — is deferred; see the reconciliation note.)
8. **OTA `ContentPolicy` delivery** on R2 + CDN (`latest.json` pointer + versioned files).
9. Observability spine: `nestjs-pino` + Sentry + Langfuse (input-capture off); spend/rate-limit OTel metrics; redaction CI fixture; OTel bootstrap imported first in `main.ts`.
10. Client-boundary hardening: wrap `apiClient` to normalize `fetch` rejections into the `OFFLINE` envelope.
11. Tests: Vitest + Nest `Test.createTestingModule`/supertest e2e + MSW LLM mocks (record/replay) + gated nightly `RUN_LIVE_LLM=1` contract job under a tiny cap.

**Defer behind named seams (do NOT build the feature logic — the tables already exist):**
- **Accounts/auth** → Better Auth module; token mechanism reconciled before any auth UI. Build it when publishing is greenlit.
- **Catalog/publishing/Discover** → publish/Discover *endpoints* + a `search` repository module + pg-boss jobs (the tables exist from the db-setup decision; only the feature logic is deferred). **Exception — official standard packs:** the catalog's *read*/download side (serving first-party *"official"* standard packs from `published_pack` + R2) is a **v1 onboarding** concern — first launch lets the user pick ≥1 pack and downloads it — so it ships sooner than the community *write* side (publish/ratings/reports). The bundled **starter pack** keeps offline-first if onboarding can't reach the network.
- **Full moderation** → `moderatePack()` interface + append-only takedown-evidence table; staffed queue + admin panel (ToolJet/Appsmith, or Retool if paying per-seat).
- **pgvector** → until trigram/string dedupe demonstrably misses paraphrases.
- **Languages catalog** → a read-only `GET /v1/languages` serving the **dynamic** word-language list (+ per-language `direction` ltr/rtl + offline-pack availability) for the app's first-run + change-language pickers (the first-run flow then downloads the chosen language's official standard pack(s)); backed by a DB table (or a constant) when it lands. Word languages are server-driven, so the client never hardcodes them.
- **Content-tier enforcement** → the `adult`/18+ gate + the content-filter pass; deferred per the reconciliation note (the `standard | adult` keys exist in the contract now).
- **Server-side streaming generation UX** → v3, with a real-device verification gate.
- **v3 online multiplayer / cast-to-TV** → a NestJS WebSocket gateway (`@nestjs/websockets` / `@nestjs/platform-ws`) on the *same* process; reserve a Compose `--profile realtime`; reuse `@alias/contracts`.

---

## 5. Proposed project layout

**Locked: a single git monorepo under the workspace root — `application/` (Expo app) + `beckend/` (NestJS) as sibling project folders, plus `packages/contracts/` (shared Zod — now scaffolded as a tsup-built package).** Plain folders (no npm-workspaces tooling); `packages/contracts/` is shared by relative-path import — depended on via `"@alias/contracts": "file:../packages/contracts"`. Each project owns its `CLAUDE.md`; the repo root holds the workspace guide.

```
alias-workspace/                        # repo root = the VS Code "workspace"
├── CLAUDE.md                           # WORKSPACE guide (describes everything; offline-first invariant)
├── application/                        # the Expo / React Native app (the mobile project)
│   ├── CLAUDE.md                       # MOBILE guide (RN conventions, offline-first gameplay)
│   ├── app/ …                          # Expo Router routes
│   ├── src/ …                          # apiClient, features, theme, …
│   ├── design/ …                       # visual mockups (index/arcade/vivid .html)
│   ├── alias-game-requirements-v2.md   # full product spec
│   ├── app.config.ts
│   └── tsconfig.json
├── packages/
│   └── contracts/                      # shared Zod source of truth (SCAFFOLDED; tsup-built dist, consumed via file:../packages/contracts)
│       ├── generation.ts               # GenerationRequest, WordCard, aiMeta
│       ├── content-policy.ts           # ContentPolicy{locale, version, blocklist[]}
│       ├── locale.ts                   # LocaleSchema (open BCP-47 string) + LAUNCH_LOCALES
│       ├── errors.ts                   # error envelope incl. OFFLINE/NETWORK_UNAVAILABLE
│       ├── pack.ts                      # slim card {w,d,t?,h?}, Pack metadata
│       └── index.ts
└── beckend/                            # the new backend — a single NestJS app (Fastify adapter)
    ├── CLAUDE.md                        # BACKEND guide (NestJS conventions, scope, seams)
    ├── backend-architecture.md          # THIS doc — architecture + rationale
    ├── src/
    │   ├── main.ts                      # bootstrap: OTel FIRST; Fastify adapter; ZodValidationPipe + error filter via APP_PIPE/APP_FILTER; Swagger via cleanupOpenApiDoc (nestjs-zod 5); GET /health
    │   ├── app.module.ts                # root module; imports feature + infra modules
    │   ├── config/env.ts                # ConfigModule + Zod (or @t3-oss/env-core) — boot-time validation
    │   ├── features/
    │   │   ├── generation/             # FIRM V2 — the headline proxy
    │   │   │   ├── generation.module.ts
    │   │   │   ├── generation.controller.ts   # POST /v1/generate (chunked, non-streaming)
    │   │   │   ├── generation.service.ts
    │   │   │   ├── provider.ts                # Provider interface + Anthropic Haiku impl (swappable)
    │   │   │   ├── content-gate.ts            # normalizer + blocklist + output re-scan
    │   │   │   └── prompt.ts                  # fixed system prompt; theme as delimited DATA block
    │   │   ├── content-policy/         # FIRM V2 — OTA ContentPolicy read path (R2)
    │   │   ├── accounts/               # SEAM — Better Auth wiring; not built
    │   │   ├── catalog/                # SEAM — publish/Discover endpoints + search repo; not built
    │   │   └── moderation/             # SEAM — moderatePack() + queue; not built
    │   ├── common/
    │   │   ├── guards/attestation.guard.ts    # App Attest / Play Integrity (Verifier iface; bounded soft-fail)
    │   │   ├── guards/budget.guard.ts         # 3-tier Upstash hard-reservation (Lua)
    │   │   ├── interceptors/content-gate.interceptor.ts
    │   │   └── filters/error-envelope.filter.ts   # maps to the shared @alias/contracts error envelope
    │   ├── infra/
    │   │   ├── redis.ts                 # Upstash client + reservation Lua
    │   │   ├── r2.ts                    # R2 / S3-compatible blob client
    │   │   ├── otel.ts                  # OTel SDK + Collector exporter
    │   │   ├── logger.ts                # nestjs-pino + trace correlation
    │   │   ├── llm-client.ts            # ONE instrumented LLM wrapper (Langfuse spans live here)
    │   │   ├── normalize.ts             # SHARED normalizer (device + server parity) — re-exported to app
    │   │   └── queue.ts                 # SEAM — pg-boss adapter (when catalog lands)
    │   └── db/                          # PROVISIONED NOW (per db-setup decision)
    │       ├── schema/                  # Drizzle tables: account, published_pack, rating, install, report, moderation_verdict, content_policy
    │       ├── migrations/              # drizzle-kit generated SQL
    │       ├── seed.ts                  # content_policy + sample packs
    │       └── client.ts                # Drizzle + node-postgres pool
    ├── test/
    │   ├── e2e/                         # Test.createTestingModule / supertest
    │   ├── msw/                         # LLM mock fixtures (record/replay)
    │   └── redaction.fixture.test.ts    # BLOCKING: theme/token/BYO-key never exported
    ├── docker-compose.yml               # postgres 17 + pgweb (+ optional mock-llm)
    ├── drizzle.config.ts                # drizzle-kit config (schema + migrations dir)
    ├── railway.json                     # config-as-code
    ├── .env.example                     # DB_URL, REDIS_*, R2_*, provider keys; + 3x EXPO_PUBLIC_API_URL hints
    ├── nest-cli.json
    ├── tsconfig.json
    └── package.json
```

The shared **normalizer** (`infra/normalize.ts`) is the one server file the RN client also imports (device/server parity for the content gate and `contentHash`) — keep it dependency-free so it's RN-safe.

> The current layout is plain sibling folders. If publishing is greenlit and the backend grows, formalizing npm-workspaces (`apps/mobile`, `apps/api`, `packages/contracts`) is the documented next step — keep `expo-router/entry` `main` and the `@/*` alias intact, and add a CI guard that `application` + `beckend` resolve the same `@alias/contracts` version.

---

## 6. Risks & open decisions

**Genuine forks for the human to decide (crisp either/or):**

1. **Repo layout?** → **DECIDED: a single git monorepo under the workspace root — `application/` + `beckend/` as sibling project folders, plus `packages/contracts/`**, shared via relative-path import (not npm-workspaces). Each project owns its `CLAUDE.md`. Formalize npm-workspaces only when accounts/catalog are greenlit.
2. **Host: Railway vs Render for the (eventual) DB tier?** → *Railway* for unified DX and usage-based idle pricing. *Render* for the **PII + legal-evidence Postgres** specifically (PITR + automatic backups on all paid tiers). Compromise: Railway for compute, but treat **verified PITR-capable backups + a tested restore runbook as a v2 launch gate**, plus encryption-at-rest and private-network-only DB access. (The firm-v2 proxy needs no DB at all — this fork only bites when the catalog lands.)
3. **BYO-key transport: client-direct vs proxied?** → *Client-direct* strongly preferred. *Proxied* only if you must run the content gate on BYO output (then never-logged secret + CI redaction assertion).
4. **Auth token mechanism: `@better-auth/expo` session vs Better Auth issues a plain bearer?** → Decide before writing auth UI; don't run both.
5. **LLM model: Haiku 4.5 vs Gemini 2.5 Flash-Lite?** → Ship behind the `Provider` interface and **A/B Taboo-list quality (the signature feature) per locale** before committing. Switch to Flash-Lite (~10× cheaper) only if the spend cap binds and Taboo quality holds.

**Top residual risks (with mitigations):**
- **`@expo/app-integrity` is ALPHA** — pin an exact version/commit, wrap behind the `Verifier` interface, keep a fallback (raw native DeviceCheck or bounded soft-fail), verify it survives an Expo SDK 56 / RN 0.85 prebuild *first*.
- **Spend-cap race under coordinated attack** — hard Lua reservation + three tiers + ceiling at 85–90% + alerts; the single most important cost-safety control.
- **Redaction leak of `theme`/token/BYO-key** — blocking CI fixture, Langfuse input-capture off, Collector redaction tested before any backend is wired.
- **Attestation soft-fail as a budget backdoor** — bounded soft-fail budget + hard-pass for expensive paths (`count>50`, `withTaboo`) + per-platform pass-rate alerting.
- **Content-tier gate (deferred)** — when the adult (18+) tier lands, enforce it **server-side** (never client-only) alongside the per-locale blocklist; staffed takedown queue + SLA before the catalog ships.
- **R2 `Content-Encoding` footgun** — decide raw-vs-pre-gzipped once; integration test asserts byte-for-byte `contentHash` decode through the CDN.
- **NestJS + TypeScript 6 decorators** — Nest relies on legacy experimental decorators + `reflect-metadata`; verify the toolchain against the pinned `typescript ~6.0.3` *early* (tsconfig `experimentalDecorators`/`emitDecoratorMetadata` on; bleeding-edge TS minors occasionally lag Nest's metadata emit). Fallback: pin a TS version Nest officially supports for the `server` package only (the RN app keeps its own TS).
- **Zod as the only DTO source** — accidentally adding class-validator DTOs (Nest's default examples use them) forks the wire contract; enforce with review + a lint rule. Use `nestjs-zod` exclusively.
- **db migration drift** — never `drizzle-kit push` against shared environments; use `drizzle-kit generate` + migrate so dev DBs don't diverge from the immutable-record schema.

---

## 7. Rough cost posture at low scale (mostly idle)

| Line item | Monthly |
|---|---|
| Railway always-on container | ~$5–15 |
| Upstash Redis (counters; HTTP) | free tier → pennies |
| Cloudflare R2 + CDN (tiny gzipped JSON blobs, **zero egress**) | ~$0 (cents of storage) |
| Langfuse Cloud / Sentry / Grafana-or-Axiom | free tiers |
| Postgres *(provisioned now — local Docker $0; hosted)* | ~$5–10 |
| Better Auth *(no per-MAU fee; when auth lands)* | $0 |
| OpenAI `omni-moderation` *(when catalog lands)* | $0 |
| **Fixed infra subtotal** | **~$10–30/mo** |
| **LLM token spend (AI proxy)** | the *only* scary variable — **hard-capped** by the global monthly reservation; prompt-cache the static system+policy prefix to cut repeat input cost ~10× |

The one real cost cliff is the AI proxy under abuse — which is exactly why the hard-reservation spend cap (§D4) and bounded attestation soft-fail (§D4) are load-bearing, not optional.

**Existing client touchpoints this design depends on** (under `application/`, the mobile project): `application/src/lib/apiClient.ts` (wrap for the `OFFLINE` envelope), `application/src/lib/config.ts` (`apiUrl` default), `application/src/lib/storage.ts` (`expo-secure-store` token), `application/src/features/auth/schemas.ts` (migrate server-touching schemas into `packages/contracts/` when auth lands).
