# Alias — App Flow & Pages

A map of **every page/screen in the Alias app**, what each one does (key buttons, modals, actions), and **which backend connection — if any — it uses**. Compiled from [`application/alias-game-requirements-v2.md`](application/alias-game-requirements-v2.md) §6–§7, the design mockups in [`application/design/`](application/design/), and [`beckend/backend-architecture.md`](beckend/backend-architecture.md).

> **The one invariant:** the backend **never gates gameplay**. A full game plays in airplane mode on a fresh install with the bundled starter pack. Backend calls only ever *write* packs/data into local storage and **degrade softly** (failures become a non-blocking "temporarily unavailable", never a gameplay error). Where a page says **Backend: None**, it works fully offline.

**Legend** — `v1` ships first · `v2` later · `v3` future. **Backend** lines mark a connection as **Wired** (endpoint stubbed today), **Seam** (deferred, table/interface exists), or **None**.

---

## A. First-launch onboarding (`v1`)

Shown once on first launch (re-runnable from Settings), three quick steps before Home.

### A1. App (UI) Language `v1`
- **Purpose.** "Choose your language" — pick the **interface** language.
- **UI & actions.** Scrollable list of the 5 bundled launch locales (en, es, fr, de, pt) with endonym + flag; tap selects and applies immediately → next step. *This is the UI language, **not** the word language.*
- **Backend.** **None** — i18n strings are bundled in the app.

### A2. Word Language `v1`
- **Purpose.** "Choose word language" — pick the language the **word cards** are drawn in.
- **UI & actions.** List from the dynamic catalog; each row has a **Download for offline play** control with states *Download + size → downloading → ✓ Available offline*. Choice becomes the default play language in Setup.
- **Backend.** **Seam — `GET /v1/languages`** (dynamic word-language catalog + offline availability); downloads pull pack blobs from **R2/CDN**. The bundled **starter pack** (default language) always works offline; catalog/downloads degrade softly when offline.

### A3. Starter Packs `v1`
- **Purpose.** "Choose at least one pack" — pick the standard pack(s) to play in the chosen word language.
- **UI & actions.** Catalog list for the selected language (a *Starter* set + themes like Animals / Movies), each with a **Download** control (size → downloading → ✓ ready); pick **≥1** → downloads into local storage → becomes the default selection in Setup. At least one pack is required to finish onboarding.
- **Backend.** **Seam** — same catalog + **R2/CDN** path as Discover; these are first-party *"official"* packs. Offline at first run falls back to the **bundled starter pack** so play still works; download more later.

---

## B. Core game loop (`v1`)

`Home → Setup → Game Intro → Game → Round Result → Winner`. **Everything inside an active game is 100% offline.**

### B0. Home / Main Menu `v1`
- **Purpose.** Launch hub for everything outside a game.
- **UI & actions.** Large **Play** → Setup; **Resume game** card when a session is in progress; menu entries → Word Packs/Library, How to play (Rules), Settings, **Profile** (`v2`: signed-out shows *Sign in / Create account*); optional streak/coins/level meta.
- **Backend.** **None** — Resume reads local storage; no account needed to Play. (Profile entry leads to auth, `v2`.)

### B1. Setup `v1`
- **Purpose.** Configure teams, mode, scoring, finish condition, packs — then start.
- **UI & actions.** Scrollable form: **Teams** (add/remove rows, 2–8, name + optional color), **Game mode** toggle (Time Score / Max Score), **Describe mode** (`v2`), **Timer & scoring** (duration 15–300s, correct/skip/foul scores, skip limit), **Finish condition** (round count *or* max score + "Finish the rotation" toggle), **Word packs** (multi-select → combined pool), and a **Change language** button → opens the **word-language modal** (primary + optional **secondary** = bilingual mode). Sticky **Start Game** (disabled until valid). Optional **Presets** (Family/Party/Hardcore).
- **Backend.** **Seam — `GET /v1/languages`** powers the Change-language modal (cached; bundled starter offline). Pack pool is local (standard packs were downloaded from the catalog, then cached). **The word draw itself never touches the backend.**

### B2. Game Intro / Hand-off `v1`
- **Purpose.** Pass the phone to the next team and prep the round.
- **UI & actions.** Big **team name** + score, round info ("Round X of N" or "Score: cur/target"), describe-mode reminder, large **Start Round** (optional deliberate tap/long-press so the next word can't be peeked). Optional **Restart / Back to setup** behind a confirm dialog.
- **Backend.** **None.**

### B3. Game / Gameplay (hot path) `v1`
- **Purpose.** The core loop: show a word, mark Correct/Skip/Foul, beat the clock.
- **UI & actions.** Prominent **timer** (last-10s state), centered **current word** (Taboo list beneath in Taboo mode), large **Correct** / **Skip** (+ optional **Foul**) buttons, live round + total score, optional words/skips-remaining. **Undo last** affordance; double-tap debounce; **Paused** overlay on backgrounding; Android back confirms exit.
- **Backend.** **None** — this is the release gate. Words, timer, scoring all run on-device.

### B4. Round Result `v1`
- **Purpose.** Summarize the round, route to the next step.
- **UI & actions.** Team name/color, **correct / skipped / foul** counts, signed **score change** + new total, **Continue**. Optional **word recap** list (Correct/Skipped/Foul per word) with optional **contest-a-call** (`v2`) that recomputes score from per-word records. Continue evaluates end-of-game → Winner or next team's Game Intro.
- **Backend.** **None.**

### B5. Winner `v1`
- **Purpose.** Celebrate the result, offer next steps.
- **UI & actions.** Celebratory **winner** banner (confetti, team color), **final scoreboard** (ranked + stats), total rounds, **Restart Game** (same teams/settings) and **New Game** (→ Setup). **Tie → sudden-death**: never a draw — routes back into an extra round until one winner. Optional **Share results** card via OS share sheet.
- **Backend.** **None** — share uses the OS share sheet; the image is generated locally.

---

## C. Hub & support screens (`v1`)

### C1. Rules / How to Play `v1`
- **Purpose.** Plain-language explanation of play, Correct/Skip/Foul, modes, scoring, end conditions.
- **UI & actions.** Scrollable, accessible read-only content; a short note per describe mode.
- **Backend.** **None.**

### C2. Settings `v1`
- **Purpose.** App-wide preferences + offline word-language management.
- **UI & actions.** Sound / haptics toggles, theme (light/dark/system), high-contrast & large-text, **App language (UI)** (labelled as *not* the word language; RTL switch prompts a reload), left/right-handed layout, default duration & scoring, and a **Word languages** section to **download/remove** languages + set the default word language. `v2`: **AI provider** ("Built-in" vs "Use my own API key" — BYO key stored in `expo-secure-store`, never synced), an **Account** row, and a **Report a problem / DMCA** link.
- **Backend.** Mostly **None** (prefs are local). **Word languages** uses **`GET /v1/languages`** + **R2/CDN** downloads (Seam). `v2` Account row → **auth Seam**; BYO key talks directly to the AI provider, never our server.

### C3. Word Language Picker `v1`
- **Purpose.** Browse/download word languages; pick primary (+ optional secondary). Reached from first-launch, Setup's Change-language modal, and Settings.
- **UI & actions.** Catalog rows with offline-available / **Download** indicators; select **primary**, optionally a **secondary** to enable bilingual mode.
- **Backend.** **Seam — `GET /v1/languages`** + **R2/CDN** downloads; bundled/downloaded languages remain available offline.

---

## D. Packs, content & AI

### D1. Word Packs / Library `v1+`
- **Purpose.** Browse and select packs (single or **combined multi-pack** pool).
- **UI & actions.** Tabbed hub. **My Packs** (offline): starter / downloaded (official & community) / custom / AI / imported with source + rating badges and language flags; **Create**, **Import**, edit/delete. **Discover** (`v2`, online): search/filter (language, rating, difficulty, theme, tags), sort Popular/New/Trending, **Install** (caches locally), **Report** per pack; gracefully disabled offline, hidden when `publicCatalogEnabled = false`.
- **Backend.** **My Packs: None** (local — though official/community packs got there via download). **Catalog/Discover: Seam** — the **official standard packs** (first-party) and community packs share one catalog search/install path + **R2/CDN** blob download; reads OTA **`GET /v1/content-policy/:locale`** for the content gate.

### D2. AI Pack Generator `v2`
- **Purpose.** Generate a word pack from a theme prompt, natively in the chosen word language.
- **UI & actions.** Theme prompt (≤200 chars), word count, language, content-filter *(deferred — plays `standard`)*, **auto-fill Taboo + translations** toggle, **Generate** → progress → an **editable draft** (per-word edit / delete / regenerate, review-before-save). Saved as a `source:'ai'` pack that plays fully offline.
- **Backend.** **Wired — `POST /v1/generate`** (chunked ~25 words/call; client loops with an AbortController). Gated by **attestation + 3-tier spend cap**; output runs through the **content gate** (reads `content-policy`). Failures soft-fail to *"AI temporarily unavailable — saved packs still work."*

### D3. Pack Editor `v2`
- **Purpose.** Create/edit a pack and its words.
- **UI & actions.** Header (name, cover emoji, **language**, content rating); word rows (word, difficulty, collapsible **Taboo** list) added via an **Add / edit Word** modal; bulk "paste list", live counters (count, difficulty histogram, duplicate badge), in-editor dedupe. Imported packs are immutable — editing **forks** a copy (keeps attribution + `contentHash`).
- **Backend.** **None** — editing is local. (Publishing is a separate, deliberate action → D5.)

### D4. Share / Import Pack `v2`
- **Purpose.** Share or receive a pack offline.
- **UI & actions.** Share via **QR code** (small packs) or **`.aliaspack` file** through the OS share sheet. Import scans a QR / opens a file → **Import Preview** (name, count, rating, sample words, origin) and dedupes by `contentHash` (Already have / Replace / Keep both).
- **Backend.** **None** — fully offline (peer-to-peer / file). Published packs carry creator attribution from the catalog.

### D5. Discover / Publish `v2`
- **Purpose.** The public catalog browse surface and the gated publish flow.
- **UI & actions.** Browse/search/sort/install (see D1 Discover). **Publish** is a separate deliberate action (never a Save checkbox): requires an account (prompts **Sign in / Create account** if signed-out), then an **IP/rights + rating attestation** and an automated pre-publish scan → *Approved / Held for review / Rejected*. IP-flagged packs stay usable privately but are blocked from the catalog. **Report** on every pack.
- **Backend.** **Seam** — catalog (publish/Discover/install) endpoints + **search** repo, gated by **auth** + **attestation** + **moderation** (`moderatePack()`, fail-closed). Records live in Postgres; blobs in **R2/CDN**.

---

## E. Account & social (`v2`)

### E1. Sign Up / Sign In `v2`
- **Purpose.** Create or access the publishing account (the **only** PII surface).
- **UI & actions.** Simple form — **nickname, email, password** (email verified). Required **only** for publishing; everything else stays account-free.
- **Backend.** **Seam — auth** (Better Auth, self-hosted; owns its own tables). Sign-up is **attestation-gated** to block mass account creation.

### E2. Account & Profile `v2`
- **Purpose.** Manage the creator account and published packs.
- **UI & actions.** Header (avatar, nickname, member-since, **Edit profile**); **Creator stats** (packs, installs, avg ★); **My packs** with status badges (Published / Pending / Unpublished / Taken down) + Edit & republish / Unpublish; local **Drafts**; optional **Saved**; **Account** (masked email, Change password, **Sign out**, **Delete account**); optional link to local Stats.
- **Backend.** **Seam — auth + catalog.** Delete-account distinguishes **erase PII** from **retain takedown evidence** (append-only moderation record).

---

## F. Local records & multiplayer

### F1. Stats & Achievements `v2`
- **Purpose.** Per-device records and milestone badges (most words in a round, longest streak, fastest average, games played, wins by team name).
- **UI & actions.** Read-only stat cards + achievements. No account required.
- **Backend.** **None** — device-local.

### F2. Game History `v1?`/optional
- **Purpose.** List of completed games (date, teams, winner, scores, mode, rounds).
- **UI & actions.** Tap a game → full breakdown; **Clear history**.
- **Backend.** **None** — device-local.

### F3. Multiplayer Lobby `v3`
- **Purpose.** Create/join a local-network or Bluetooth room; each phone becomes a buzzer/guesser while one shows the word.
- **UI & actions.** Create/join room, device roster, ready states.
- **Backend.** **None from this service** — peer-to-peer (local network / Bluetooth). A future NestJS WebSocket gateway is a separate `v3` add-on.

---

## Backend surface (quick reference)

| Path / capability | Status | Used by |
| --- | --- | --- |
| `GET /health` | **Wired** | infra / Railway healthcheck |
| `POST /v1/generate` | **Wired** (stub → `NOT_IMPLEMENTED`) | D2 AI Pack Generator |
| `GET /v1/content-policy/:locale` | **Wired** (stub → `NOT_IMPLEMENTED`) | content gate behind D1 Discover, D2 Generate (OTA blocklist) |
| `GET /v1/languages` | **Seam** (deferred) | A2 / B1 / C2 / C3 word-language pickers |
| Catalog: publish / Discover / install / report | **Seam** (tables exist) | D1 Discover, D5 Publish |
| Auth (Better Auth) | **Seam** | E1 Sign Up, E2 Profile, D5 Publish gate |
| Moderation (`moderatePack()`, fail-closed) | **Seam** | D5 Publish |
| R2 + CDN blobs (`packs/{hash}.json.gz`, `policy/{locale}/…`) | storage | language downloads, pack installs, OTA policy |

Every backend failure → the shared **error envelope** (`OFFLINE`, `NETWORK_UNAVAILABLE`, `RATE_LIMITED`, `BUDGET_EXHAUSTED`, `ATTESTATION_FAILED`, `CONTENT_REJECTED`, `VALIDATION`, `NOT_IMPLEMENTED`, …) and surfaces in the app as a **soft, non-blocking** state.

## Navigation flow

```
First launch → A1 App language → A2 Word language → Home
Home → Setup → Game Intro → Game → Round Result →
                 ├─ (not finished) → Game Intro (next team)
                 └─ (finished)     → Winner
Winner → Restart (same teams) → Game Intro
       → New Game → Setup
       → Tie → sudden-death → Game
Home → Word Packs/Library · Rules · Settings · Profile (sign in to publish)
Word Packs → Pack Editor / AI Generator / Discover · Share/Import
```
