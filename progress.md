# Alias — Progress & Roadmap to Completion

A living status tracker for the whole Alias workspace: **what is built, what is in flight, and everything still to do until the product is complete** (v1 → v2 → v3).

> **This is a status doc, not a design doc.** Decisions, rationale, and the authoritative spec live in the four canonical docs — this file only tracks *where we are against them* and must never become a fifth source of truth:
> - [`application/alias-game-requirements-v2.md`](application/alias-game-requirements-v2.md) — product spec + data model
> - [`alias-flow.md`](alias-flow.md) — every screen + its backend connection
> - [`beckend/backend-architecture.md`](beckend/backend-architecture.md) — backend tools/decisions/seams
> - [`beckend/db-architecture.md`](beckend/db-architecture.md) — DB schema/tables/enums
>
> When a decision changes, update the canonical docs first, then reconcile this tracker.

**Legend** — Phase: `v0` MVP · `v1` first release · `v2` · `v3`. Status: ✅ done · 🟡 partial / in progress · ⬜ not started.

---

## Snapshot — 2026-06-08

The **offline core game is playable end-to-end** on-device: `Home → Setup → Game Intro → Gameplay → Round Result → Winner`, covering **Time Score**, **Max Score**, and **sudden-death tie-breaks**, with undo, foul/skip gating, and a drift-free absolute-timestamp timer that auto-ends the round. It runs entirely offline on a bundled 50-word English starter pack, in any of 3 selectable themes. **All gameplay logic is a pure, fully-tested engine** (129 tests green). The game now **survives an app kill and backgrounding**: the session persists on every change and rehydrates on launch (with a migration ladder), an interrupted round re-enters a **Paused** state, leaving the gameplay screen freezes + saves the round (resumable from Home), and Home offers **Resume / New game / Discard**.

Setup is now full-spec (scoring/presets/buzzer/describe-mode, persisted defaults), **haptics** are wired, **all strings are i18n'd** (English end-to-end), and there's a **How-to-play** screen + a polished **Winner** (confetti/share). What's **not** there yet: bundled **sound assets** (audio is no-op plumbing until they land), the **pack library** + word-language picker, first-launch **onboarding**, the accessibility/Settings remainder (high-contrast, large-text, languages), and a standalone-build run of the **Maestro E2E** in true airplane mode (the flows pass in dev). The **backend is coming online** — the full v2 DB schema is authored (§3.2), and the two read/headline paths are live: `GET /v1/content-policy/:locale` (OTA read) and the **AI generation proxy** `POST /v1/generate` (provider + spend cap + attestation + content gate, all env-gated). The remaining endpoints (catalog/publish/auth/moderation) stay deferred seams — correct, since the backend must never gate gameplay and isn't needed until v2.

| Area | State |
| --- | --- |
| Mobile core game loop | ✅ playable (Time + Max + sudden-death) |
| Game engine (rules/scoring/word-draw/timer) | ✅ complete, pure, tested |
| Themes | ✅ 3 (classic light+dark · arcade · vivid) |
| Bundled starter pack | ✅ 50 words, English, `builtin` |
| Tests (app) | ✅ 129 passing / 27 suites |
| Lifecycle: persist + resume-after-kill + background-pause | ✅ persistence, rehydrate, Paused overlay, resumable exit |
| Sound & haptics | 🟡 haptics wired (`expo-haptics`); sound is no-op until assets |
| v1 menu/support screens (Rules, Library, onboarding, full Setup/Settings) | ⬜ / 🟡 |
| i18n + accessibility pass | 🟡 i18n foundation done (English E2E); a11y pass + RTL audit pending |
| Airplane-mode E2E (release gate) | 🟡 `.maestro/` flows pass (full game, dev); airplane-mode run needs a standalone build |
| Backend service | 🟡 v2 schema authored; `/v1/generate` + `/v1/content-policy` + `/v1/languages` + `/v1/packs` live (env-gated); community write side deferred |
| Backend DB | 🟡 **schema authored** (8 tables + enums, migration `0000` + seed); migrate/seed run against local Postgres |
| `@alias/contracts` | ✅ scaffolded (errors, generation, content-policy, pack, locale) |

---

## 1. What's done ✅

### 1.1 Mobile — game engine (`application/src/features/game/`) — `v0`
The heart of the product, built first and kept pure (no React, no I/O) so it's exhaustively testable.

- ✅ **Domain model** (`types.ts`) — `GameConfig`, `Team`, `InProgressRound` (mark-based, undo-ready), `RoundResult`, `SuddenDeathState`, `GameSession` (stamped `GAME_SESSION_SCHEMA_VERSION = 1`).
- ✅ **Scoring** (`scoring.ts`) — correct/skip/foul deltas; **negative totals allowed**; live score always derived from per-word `marks` (never a running counter), so undo and contest-a-call stay consistent.
- ✅ **Word draw** (`wordDraw.ts`) — shuffled pool, **never-repeat-while-unused**, reshuffle-on-exhaust excluding the on-screen word.
- ✅ **Timer** (`timer.ts`) — absolute `roundEndTimestamp` math; `hardStop` / `finishWord` buzzer rules.
- ✅ **Engine reducer + selectors** (`engine.ts`) — `createSession`/`startRound`/`mark`/`undoLast`/`endRound`/`continueAfterResult`/`restart`; both **Time + Max** end-of-game, **sudden-death** rotation, `activeTeam`/`liveTeamScore`/`rankedTeams`/`winner`/`canSkip`/`canFoul`, `validateSetup`, `defaultGameConfig`.
- ✅ **React glue** — `useGameSession` (Zustand store dispatching engine transitions with the wall clock) and `useRoundClock` (absolute-timestamp ticker that auto-ends the round at 0).

### 1.2 Mobile — packs (`application/src/features/packs/`) — `v0`
- ✅ **Bundled starter pack** `STARTER_EN` — 50 words, English, slim `{w,d,t?}` wire shape, `source: 'builtin'`, validated against the contract `Pack`.
- ✅ **Word-pool adapter** (`pool.ts`) — maps wire `Card[]` → engine pool, assigns local card ids, merges/dedupes across packs (combined-pool ready), exposes `cardsById`.

### 1.3 Mobile — theme system (`application/src/theme/`) — `v1`
- ✅ **3 selectable themes** matching the design mockups: **classic** (light + dark), **arcade** (dark), **vivid** (dark).
- ✅ Superset `ThemeColors` contract + optional `Decoration` groups (gradients, team colors, 3D button styles); `registry.resolveTheme(key, appearance, osScheme)`.
- ✅ Zustand theme store **persisted to AsyncStorage**; `ThemeProvider` + `useTheme()` + `useThemedStyles()`.

### 1.4 Mobile — UI primitives (`application/src/components/ui/`) — `v1`
- ✅ Foundational: `Text`, `Button` (flat + gradient + 3D), `Card`, `Screen` (themed/gradient background).
- ✅ Game primitives: `WordCard` (taboo + golden variants), `TimerRing` (SVG arc, danger state < 10s), `ActionButtonBar` (Correct/Skip/Foul — icon **+** color, theme-aware), `SegmentedControl`, `Chip`.
- ✅ All primitives unit-tested.

### 1.5 Mobile — screens & routing (`application/app/`) — `v0`/`v1`
Flat Expo Router stack; the whole turn flow is one status-driven route (no mid-round navigation churn).
- ✅ **Home** (`index.tsx`) — Play, conditional **Resume** (in-memory), Settings.
- ✅ **Setup** (`setup.tsx`) — teams (add/remove/rename, auto colors), **mode toggle**, round-timer stepper, rounds-per-team / target-score stepper, pool count, validation, Start. *(MVP slice — see §2.2 for the full-spec gaps.)*
- ✅ **Game** (`game.tsx`) — status router → the four feature screens:
  - **Game Intro** — pass-the-phone, team + score, round/score/sudden-death info, Start Round.
  - **Gameplay** — team + live score, `TimerRing`, `WordCard` (taboo in taboo mode), **Undo last**, `ActionButtonBar` with skip/foul gating, auto-end on expiry.
  - **Round Result** — correct/skip/foul tiles, signed delta, new total, Continue.
  - **Winner** — 🎉 banner, ranked scoreboard, New Game / Restart (sudden-death handled by the engine).
- ✅ **Settings** (`settings.tsx`) — live theme + appearance picker (all 3 themes). *(Theme only — full Settings is §2.2.)*

### 1.6 Mobile — dormant v2 seams
- ✅ `lib/apiClient.ts`, `config.ts`, `queryClient.ts`, `storage.ts` retained as the network seam (unused by gameplay; the removed sample `auth` feature + `session` store were intentionally deleted).

### 1.7 Backend (`beckend/`) — scaffolded, dark — `v2`  *(full backend track + to-do: §3)*
- ✅ NestJS 11 on Fastify, Node 24; boots with **zero outbound connections** (offline-first verified).
- ✅ Live endpoints: `POST /v1/generate` (full AI proxy — §3.3.2), `GET /v1/content-policy/:locale` (R2/CDN OTA read — §3.3.1), `GET /v1/languages` (dynamic catalog — §3.3.4), `GET /v1/packs` (official-pack catalog read — §3.3.5); all DB/R2-backed reads soft-degrade. `GET /health` live.
- ✅ Real error-envelope exception filter + global `ZodValidationPipe`; attestation/budget **guards** + content-gate **interceptor** are pass-through skeletons; infra clients (Redis/R2/LLM) are env-gated stubs; `infra/normalize.ts` is real (RN-safe). Seams `accounts`/`catalog`/`moderation` are empty placeholders.
- 🟡 **DB schema authored** — the 8 v2 app-domain tables + 10 enums + indexes/FKs in `src/db/schema/`, migrations `0000_silly_spot.sql` (+ `pg_trgm`) and `0001` (BCP-47 `CHECK` on `language.code`), and an idempotent `seed.ts` (content_policy + language catalog + official account + starter pack). `db:migrate`/`db:seed` run against the local Postgres (Docker). *(See §3.2 for the table tracker.)*
- ✅ Test scaffolding present (`test/e2e`, `test/msw`, `test/redaction.fixture.test.ts`, `setup.ts`).

### 1.8 Shared contracts (`packages/contracts/`) — `v2`
- ✅ tsup-built `@alias/contracts` (peer-dep Zod) consumed by app + backend via `file:`. Schemas: error envelope, `GenerationRequest`/`WordCard`/`AiMeta`/`GenerationResponse`, `ContentPolicy`, `Pack`, `Locale` (open BCP-47 + `LAUNCH_LOCALES`).

---

## 2. What's next — milestones to completion

Build order stays **mobile-first**; the backend is a parallel track (§3). Each box is a concrete, code-level task grounded in the gaps above. Where a feature spans the stack, a nested **↳ Backend** line tracks the server/DB piece beside its frontend task (the ordered backend build + the DB migration live in §3, which each ↳ line points into).

### 2.1 Milestone A — Finish the MVP (v0): lifecycle & feel  ⟵ in progress
The spec's MVP explicitly requires kill/resume, background handling, basic haptics, and validation. The engine is ready; this is wiring + native feel. **The lifecycle backbone is done; the "feel" pass (sound/haptics, buzzer-rule UI, mis-tap debounce) is what remains.**

- ✅ **GameSession persistence** — `persistence.ts` mirrors the live store to AsyncStorage on every meaningful change, stamped `GAME_SESSION_SCHEMA_VERSION` with an extensible, forward-progress-guarded migration ladder run on launch; `cardsById` is rebuilt from the persisted packs (deterministic ids), not serialized. Best-effort/offline-safe.
- ✅ **Resume / Discard after kill** — launch rehydrate behind a hydrate gate in `_layout.tsx`; Home offers **Resume / New game / Discard** (confirmed). An interrupted round re-enters the **Paused** state (full-round fallback on a foreground crash, never a 0s forfeit).
- ✅ **Background lifecycle** (`AppState`, spec §8) — `useGameLifecycle` pauses the round on leaving the foreground (captures remaining); foreground shows a **Paused** overlay and **never auto-resumes** — the tap re-anchors `roundEndTimestamp` via `resumeEndTimestamp`. The ticker is frozen while paused; leaving the gameplay screen (back/swipe/nav) also freezes it.
- ✅ **Leave-during-round is non-destructive** — iOS swipe-back / Android back / any nav leaves cleanly (no native-stack desync); the `Gameplay` unmount-`pause()` freezes + persists the round so it's resumable from Home. *(A confirm dialog was intentionally dropped: native-stack can't confirm an interactive swipe via public APIs and leaving loses nothing — see [`bug.md`](bug.md) B2.)*
- 🟡 **Sound + haptics** (spec §11) — `expo-haptics` wired for Correct/Skip/Foul/times-up/win, gated by the in-app Vibration toggle (`src/features/settings/feedback.ts`). **Sound is no-op plumbing** (toggle + call sites present) until bundled audio assets land; expo-audio not added yet.
- ✅ **Last-10s / 5s escalating warning** — light tick each second over the final 10s, escalating to medium under 5s (haptic; audio when assets land). TimerRing keeps the visual danger state.
- ✅ **Mis-tap debounce** on action buttons (250ms one-shot guard in Gameplay's `mark`).
- ⬜ **Surface the buzzer rule** (`hardStop` vs `finishWord`) in the UI (engine already supports it).

### 2.2 Milestone B — Complete v1 (first shippable release)

**Setup screen → full spec** (🟡 in progress — config-driven items done; pack/language items await their tracks):
- ✅ Scoring config — correct (1–10), skip (−5–0), foul on/off + score (−5–0); skip-limit toggle + stepper. Plus the **buzzer rule** selector (closes the Milestone A "surface buzzer rule" item).
- ✅ Max-mode **Finish-the-rotation** fairness toggle.
- 🟡 Team **color** picker + duplicate-name soft warning. *(Avatar picker deferred.)*
- ✅ **Describe-mode** selector (Describe / Taboo; other modes are v2).
- ⬜ **Word-pack multi-select** entry + combined-pool count *(needs the Pack library below)*.
  - ↳ **Backend (`v1`):** serve official standard packs from the catalog (`published_pack` + R2 under an `official` account) so Setup lists/downloads real packs; the bundled starter is the offline seed (also a catalog row). → §3.3 (5)
- ⬜ **Change-language** button + word-language modal (primary + optional secondary for bilingual).
  - ↳ **Backend (`v1`):** `GET /v1/languages` + the `language` table (BCP-47 `code`, `endonym`, `direction`, `default_pack_id`). → §3.3 (4)
- 🟡 Presets (Family / Party / Hardcore) ✅; per-team handicap/balancing ⬜.
- ✅ Persist Setup choices as next-game defaults (`useSetupStore`, AsyncStorage, hydrated at launch).

> Built on a pure `setupConfig.ts` (config↔engine mapping + presets) and reusable `Stepper`/`Toggle` primitives.

**Menu & support screens:**
- 🟡 **Home** — ✅ Rules ("How to play") entry; ⬜ Word Packs/Library, Profile (v2), streak/level meta.
- ✅ **Rules / How to play** screen (`app/rules.tsx`, i18n-native).
- 🟡 **Settings → full spec** — ✅ sound/haptics (Vibration) toggles + left/right-handed layout (`usePrefsStore`, persisted, mirrors the action bar); ⬜ high-contrast & large-text, default duration & scoring, App (UI) language, **Word-languages** download/remove section.
  - ↳ **Backend (`v1`):** the Word-languages section consumes `GET /v1/languages` + catalog read/download (`published_pack` + R2) to add/remove offline languages & packs. → §3.3 (4, 5)
- ✅ **Round Result** — word-recap list (the round's Correct/Skipped/Foul words, empty groups hidden).
- ✅ **Winner** — animated confetti (RN `Animated`, no dep), total-rounds-played, and **Share results** via the OS share sheet.

**Packs, content & data:**
- ⬜ Local **Pack store + My-Packs library** (browse/select/create/import; introduce the first-class `Pack` entity + `source` provenance; move the growing corpus to SQLite `expo-sqlite` once it outgrows a JSON blob).
  - ↳ **Backend (`v1` read / `v2` write):** official-packs catalog **read/download** (`published_pack` + R2) is `v1`; community **Discover / publish / ratings / reports** is the `v2` write side. → §3.3 (5, then 6)
- ⬜ Migration-ladder runner across local stores (game session stamps v1; theme/setup/prefs stores persisted). Server records mirror this with `schema_version` (§3.2).
- ⬜ More/larger starter content as needed.
- ⬜ **Known client data-model gaps** (spec §5): a persisted `Settings`/`AppPreferences` entity (🟡 partial — `usePrefsStore` has sound/haptics/handedness; missing `uiLocale`, defaults, downloaded languages/packs), a `Stats` blob, and a client `LanguageCatalog` shape (consumer of `GET /v1/languages`).

**i18n / accessibility (foundations):**
- ✅ Externalize all strings — **i18next + react-i18next + expo-localization** (`src/i18n/`, English catalog `locales/en.json`); every screen uses `t()`, **English end-to-end**. Plurals use i18next's built-in CLDR rules (covers all launch locales; `i18next-icu` can layer on for ICU MessageFormat if needed). RTL-safe groundwork noted (use `start`/`end`). *(Remaining: a full RTL audit + the other launch locales, both v2; engine `validateSetup` should return codes to translate.)*
- ⬜ **First-launch language onboarding** (app UI language → word language → starter packs) — degrades to the bundled starter offline.
  - ↳ **Backend (`v1`):** `GET /v1/languages` (word-language step) + official-packs catalog read/download (starter-pack step) + `content_policy` for the gate. → §3.3 (4, 5, 1)
- ⬜ Accessibility pass — roles/labels everywhere, ≥44pt targets, dynamic type, WCAG AA contrast, color **+** icon.

**Light engine extras (cheap, high-impact):**
- ⬜ Streaks / combo multiplier + **Golden Word**.

**Release gate:**
- 🟡 **Maestro airplane-mode E2E** (`.maestro/`) — `smoke.yaml` + `offline-full-game.yaml` (launch → full game → Winner) authored and **passing** against the dev build; the flows make no network calls. The true airplane-mode run needs a standalone build (set `appId`, drop `openLink`, enable `setAirplaneMode`) — documented in [`.maestro/README.md`](application/.maestro/README.md) and wired into CI before release.

### 2.3 Milestone C — v2 features (mobile) + backend lights up

**Mobile gameplay:**
- ⬜ **Describe modes** — Taboo (card data ready), One-word, Charades, Hum.
- ⬜ **Tilt-to-Play** (`expo-sensors`) — headline.
- ⬜ **Buzz-in steals**, **power-ups / wildcards**, **wager / bluff round**.
- ⬜ **Stats & Achievements** (device-local), **Game History**.
- ⬜ **Challenge-a-call** on the round recap (recomputes from per-word records).
- ⬜ Remaining UI locales (es/fr/de/pt) + lazy font pipeline.

**Mobile content & platform (the heavy part of v2):**
- ⬜ **Pack Editor** (create/edit, taboo lists, bulk paste, dedupe; imported packs fork on edit).
- ⬜ **AI Pack Generator** — `POST /v1/generate` (chunked, AbortController), **auto-Taboo**, editable draft, saved as offline `source:'ai'` pack — headline.
  - ↳ **Backend (firm-`v2` headline):** the real generation proxy — Provider + structured output + 3-tier spend cap + attestation + content gate. → §3.3 (2)
- ⬜ **Bilingual "Translate-a-pack"** mode (consumes `translations`) — signature feature.
  - ↳ **Backend:** AI gen can fill `translations`; otherwise client-only (no endpoint).
- ⬜ **Offline QR / `.aliaspack` sharing** + Import Preview (dedupe by `contentHash`).
  - ↳ **Backend:** none — fully offline; reuses the shared `infra/normalize.ts` so `contentHash` matches the server's.
- ⬜ **Public library + publishing** — account (nickname/email/password) + Profile, Discover, install/rating/report, moderation/IP-watchlist. *(Heaviest v2 item; splittable to v3 — local + offline sharing already deliver the "play with friends" value.)*
  - ↳ **Backend (`v2`):** accounts/auth (Better Auth + `account` collision fix + token mechanism), catalog **write** (publish/Discover + `search` repo + pg-boss), moderation (fail-closed queue, IP watchlist, DMCA channel). → §3.3 (6, 7, 8)
- ⬜ Content-filter selector + enforcement *(deferred per spec §15.14; `standard | adult`, no `kids`)*.
  - ↳ **Backend:** OTA `ContentPolicy` delivery (R2 versioned + `latest.json`) + the content gate + the `content_policy` table. → §3.3 (1)

> The full backend build that powers the above is tracked in **§3**; each ↳ line points to its step.

### 2.4 Milestone D — v3
- ⬜ **Local multiplayer** (Wi-Fi/Bluetooth) + cast-to-TV.
  - ↳ **Backend (`v3`):** NestJS WebSocket gateway on the same process (`@nestjs/websockets`), Compose `--profile realtime`. → §3.3 (9)
- ⬜ **Auto-foul** on-device speech recognition (consumes `translations`) — device-only, no backend.
- ⬜ Optional online play; region-variant packs (es-MX/pt-PT); **RTL (ar/he) + CJK** languages.
  - ↳ **Backend (`v3`):** online play reuses the WS gateway; region/RTL/CJK word languages are added as `language` rows + packs (no app update — `direction` is server-driven).
- ⬜ Creator profiles / remix lineage; on-device AI generation; server-side streaming generation.
  - ↳ **Backend (`v3`):** server-side streaming generation (the chunked proxy's streaming successor). → §3.3 (9)

---

## 3. Backend track (`beckend/` + `packages/contracts/`) — parallel, mostly `v2`

> The backend is **write-only to the device and never gates gameplay** (verified by the airplane-mode Maestro E2E, §2.2). The frontend tasks above carry a nested **↳ Backend** line pointing here; this section is the authoritative, ordered backend build + DB migration. Build order from [`backend-architecture.md` §4](beckend/backend-architecture.md) and [`db-architecture.md` §10](beckend/db-architecture.md).

### 3.1 Done ✅ — scaffold landed (dark)
- ✅ NestJS 11 / Fastify / Node 24 boots offline with **zero outbound connections**; real error-envelope exception filter + global `ZodValidationPipe`; `GET /health`.
- ✅ `POST /v1/generate` **live** (§3.3.2) + `GET /v1/content-policy/:locale` (§3.3.1) + `GET /v1/languages` (§3.3.4) + `GET /v1/packs` (§3.3.5) **live**; attestation/budget **guards** + content-gate + budget **interceptors** are real (env-gated to safe stubs when unconfigured); `LlmClient`/`AnthropicProvider`/`RedisBudgetReservation` wired in `infra/` behind DI tokens; the DB-read features (`languages`, `packs`) soft-degrade; `infra/normalize.ts` is real (RN-shared).
- ✅ **Observability + redaction wired** (§3.3.3): OTel NodeSDK + OTLP trace export (env-gated) with an in-process `RedactingSpanExporter`, Sentry error reporting (env-gated, errors-only), pino header redaction — `theme`/tokens/keys never leave the process; the **blocking redaction fixture** enforces it.
- ✅ `@alias/contracts` (error envelope incl. `OFFLINE`, `Generation*`, `ContentPolicy`, `Language*`, `Pack`/`PackSummary`, `Locale` open BCP-47) consumed by app + server via `file:`.
- ✅ Test scaffolding (e2e through the real pipeline, MSW, the **blocking** redaction fixture).

### 3.2 Database — schema + first migration + seed  ✅ authored *(migrate/seed run against the local Postgres)*
The full v2 model is **authored** in one pass (locked db-setup decision) so it's reviewed/stable from day one; most *mutating* endpoints stay deferred (§3.3). Drizzle schema in `src/db/schema/` (per-table files), migrations **`0000_silly_spot.sql`** (baseline; `pg_trgm` prepended for the trigram Discover index) + **`0001_curved_captain_cross.sql`** (BCP-47 `CHECK` on `language.code`), generated via `db:generate`, idempotent `seed.ts`. Verified by `db:generate` + `typecheck` + `lint` + the offline-boot tests; **`db:migrate`/`db:seed` run against a local Postgres (`docker compose up -d`)** — not exercised in this env (no Docker). `content_hash` is a plain index (not unique, per db §5.2); `search_vector` is a plain `tsvector` + GIN index populated by the deferred Discover path; per-locale regconfig (IMMUTABLE wrapper) lands with Discover.

| Table | First consumed by | Phase | Schema |
| --- | --- | --- | --- |
| `content_policy` | content gate / OTA policy (firm-v2 reads it) | `v2` | ✅ |
| `language` | `GET /v1/languages` → first-run + change-language pickers | **`v1` onboarding** | ✅ |
| `published_pack` | official-packs catalog **read/download**; community publish/Discover | **`v1` read** / `v2` write | ✅ |
| `install` · `rating` | install count + ratings on Discover | `v2` | ✅ |
| `report` · `moderation_verdict` | reports + moderation queue (fail-closed, append-only) | `v2` (catalog ships) | ✅ |
| `account` | accounts / Profile / publish attribution | `v2` (publishing) | ✅ |
| Better Auth `auth_*` (`user`/`session`/…) | login/session | `v2` (publishing) | ⬜ (generated by its CLI when auth lands) |

- ✅ **Enums** (db §4): `account_status` · `account_role` · `content_rating` (`standard`\|`adult`) · `pack_source` · `publish_status` · `moderation_decision`/`moderation_actor` · `report_reason`/`report_status` · `text_direction`.
- ✅ **Seed** (`db:seed`, idempotent): launch-locale `content_policy` rows, the `language` catalog (en/es/fr/de/pt), the first-party `official` account, and the official **starter** `published_pack` (metadata; word blobs come with the R2 path). `account.auth_user_id` stays nullable + FK-less until Better Auth lands.

### 3.3 Feature build-order (endpoints/logic — tables from §3.2)
1. ✅ **`content_policy` read path** — `GET /v1/content-policy/:locale` resolves the OTA `policy/{locale}/latest.json` pointer → immutable `v{N}.json` from the **public R2/CDN base** (credential-free read; `infra/r2.ts` `getPublicJson`), re-validates against the shared `ContentPolicy` contract, short-TTL in-memory cache. Locale BCP-47 format-validated (path-safe → `VALIDATION` 422). **Degrades soft** to an empty (permissive) policy `{version:0, blocklist:[]}` when R2 is unconfigured / absent / errors — content delivery never gates. Unit + e2e tested (R2 mocked; no creds needed). `v2`
2. ✅ **AI generation proxy** `POST /v1/generate` — full pipeline live (200 + validated `WordCard[]` chunk): `AnthropicProvider` (Haiku 4.5) via forced `tool_use` structured output → **per-chunk Zod re-validate + dedupe + cap** in the one instrumented `LlmClient`; **3-tier hard-reservation spend cap** (Upstash Lua: per-token/IP daily + global monthly, `count×1.5` projection, **refund delta** after actual usage; soft-fail tier = /10); **attestation guard** (verifier port, bounded soft-fail, **hard-pass required** for `count>50`/`withTaboo`); **content gate** (normalize untrusted `theme` → per-locale OTA blocklist → output re-scan; `theme` only ever an XML DATA block). A **`BudgetInterceptor`** refunds the reservation on ANY post-reservation error (provider/validation/rejection) so induced errors can't drain the cap. Everything **env-gated** (no key → `StubProvider`, no Redis → allow-all, no R2 → permissive policy) so the app still boots offline; tested at $0 via MSW (real Anthropic call mocked). Adversarially reviewed (5 dimensions) — fixed a critical refund-leak + retryable-4xx + token-redaction. → powers FE **AI Pack Generator** (§2.3). `v2` *headline*
   - **Deferred seams (need creds/keys):** real App Attest/Play Integrity crypto verifier (dev hard-passes), live Upstash Redis + the Lua reservation integration test (no Docker/Upstash here — guard logic unit-tested with a mocked reservation), bespoke gen-ai LLM spans in `LlmClient` (auto-instrumented HTTP spans cover the provider call — observability + the blocking redaction fixture landed in §3.3.3), server-side streaming (`v3`).
3. ✅ **Observability + redaction** — OTel NodeSDK (auto-instrumentation, OTLP trace export — point `OTEL_EXPORTER_OTLP_ENDPOINT` at a Collector or **Langfuse**) + **Sentry** error reporting (env-gated, errors-only, `skipOpenTelemetrySetup` so it coexists with the NodeSDK; the error filter `captureException`s the unknown-error path). **In-process redaction is the first line** (`infra/redaction.ts`): a key-based scrubber (`theme`/attestation/BYO+provider keys/prompt → `[redacted]`, while benign telemetry like `*_tokens`/model/route survives) wraps the span exporter (`RedactingSpanExporter`) and Sentry `beforeSend` (`redactDeep`); pino already redacts the sensitive headers; `sendDefaultPii:false` keeps request bodies off events. **The blocking CI fixture is now real** (`test/redaction.fixture.test.ts`): proves no secret survives span/event export, the Sentry scrub, or a mapped LLM error — and that benign keys survive. All env-gated → no-op on offline boot. *Remaining (deferred — need live Redis/alerting): spend + rate OTel **metrics** with 70/90% alerts; bespoke gen-ai LLM spans in `LlmClient` (auto-instrumented HTTP spans already cover the provider call).* `v2`
4. ✅ **`GET /v1/languages`** — dynamic word-language catalog. Reads the `language` table (enabled only, ordered) via the global `DbModule`; new `Language`/`LanguagesResponse` **contract** added to `packages/contracts` (server-driven `direction` for RTL). Each row is **re-validated against the contract** at the read boundary (malformed `code` dropped, never served), and the `language.code` column gains a **BCP-47 `CHECK` constraint** (migration `0001`) so a future write path can't store a bad code. **Degrades to an empty catalog** when the DB is unreachable (the client bundles the launch set + derives offline availability on-device — never gates the picker). PGlite integration test (real query + mapping + malformed-drop) + e2e degrade; adversarially reviewed (fixed an unhandled pg-pool `error` crash + added the code constraint). → powers FE first-run + change-language pickers (§2.2). **`v1` onboarding**
5. ✅ **Catalog read/download (official packs)** — `GET /v1/packs[?locale=]` serves first-party official packs (`status='listed' AND source='builtin'`) from `published_pack` via the global `DbModule`. New `PackSummary`/`PacksResponse` **contract** (+ `PackSource`/`ContentRating` enums) in `packages/contracts`. **Download is client-direct from the public R2/CDN** — each summary carries a `downloadUrl` (`R2_PUBLIC_BASE_URL + r2Key`); the backend never proxies the blob (off the data path, per backend-arch §D5). Per-row contract re-validate (malformed dropped), short-TTL cache (per locale; DB-error empty NOT cached), **degrades to an empty catalog** on DB failure (client falls back to the bundled starter). Built in a NEW `src/features/packs/` — the **community** catalog write side (publish/Discover/search/ratings/install) stays a deferred seam in `src/features/catalog/`. PGlite integration test + e2e (degrade + locale-validation); adversarially reviewed (no code defects; documented the malformed-locale-422 decision). → powers FE onboarding + Pack-Library download (§2.2). **`v1` onboarding**
6. ⬜ **Catalog write — publish / Discover / install / rating** + one `search` repo + pg-boss. → powers FE **Discover + Publish** (§2.3). `v2`
7. ⬜ **Auth** (Better Auth self-hosted) — resolve the `account` **name-collision** (prefix Better Auth tables `auth_`) + the token mechanism first; account ↔ pack FKs for repeat-infringer enforcement. → powers FE **Account/Profile/Publish** (§2.3). `v2`
8. ⬜ **Moderation** — `moderatePack()` (**fail-closed**), append-only takedown evidence, report→`held` thresholds, staffed queue + admin panel, IP/brand watchlist, the DMCA channel. `v2` (before the catalog ships, Apple 1.2)
9. ⬜ **Multiplayer WS gateway** (`@nestjs/websockets`, same process) + cast-to-TV; optional online play; server-side streaming generation. `v3`

> Budget/rate counters live in **Redis**, never the DB. **BYO-key is client-direct** (off the server). Content-tier (`adult`/18+) enforcement is **deferred**; the `standard|adult` keys exist in the contract now.

---

## 4. Cross-cutting release gates & invariants (check every milestone)

- 🔒 **Offline-first is a release gate.** No network call may gate gameplay, pack selection, or a word draw. The backend may only ever *write* packs into local storage. Verified by the airplane-mode E2E (Milestone B).
- 🔒 **One contract source.** Wire shapes live once in `packages/contracts/` (Zod); app infers types, server re-validates. Never fork a wire shape or derive it from DB tables.
- 🔒 **Privacy.** No accounts/PII for the core game or any local/AI feature; the only PII surface is the optional publishing account (v2). Game data/stats/history stay on-device.
- 🔒 **Schema versioning.** Persisted client stores and server records carry `schemaVersion` with a migration ladder.
- 🔒 **Per-project gates.** Run `lint` + `typecheck` + `test` in `application/` and/or `beckend/` before every push.
- 🔒 **Docs in sync.** A decision change updates all four canonical docs in the same pass, then this tracker.
- ♿ **Accessibility & i18n** are built in from v1, not retrofitted (roles/labels, 44pt targets, RTL-safe layout, color **+** icon).

---

## 5. Definition of done

- **v1 ships when:** the full core-game experience (all Setup/Settings options, Rules, Library, first-launch onboarding) plays offline end-to-end in English across the 3 themes, with persistence/resume, sound & haptics, an accessibility pass, and a **green airplane-mode Maestro E2E**. *(Onboarding's word-language + official-pack downloads need the `v1`-onboarding backend slice — `GET /v1/languages`, official-packs catalog read, the DB seed (§3.2–3.3) — but a fresh airplane-mode install always plays via the bundled starter, so the offline gate holds.)*
- **v2 ships when:** describe modes, AI generation (auto-Taboo), bilingual mode, the Pack Editor, offline sharing, and Stats land on-device — and (if greenlit) the backend serves AI generation + the public catalog with moderation, all degrading softly offline.
- **v3 ships when:** local multiplayer, auto-foul, additional (incl. RTL/CJK) languages, and online play are in.
