# CLAUDE.md — Alias Workspace

This is the **workspace-level** guide for the Alias repository: it describes the whole repo and how the projects fit together. For project-specific conventions, follow the per-project `CLAUDE.md` linked below.

This repo is a **single git monorepo** (one VS Code workspace) containing two projects (the mobile app and the backend) plus the shared contracts package they both consume. There is no npm-workspaces tooling — the projects are plain folders, and `packages/contracts` is consumed via a relative `file:` path.

---

## Workspace map

| Path | What | Guide |
| --- | --- | --- |
| `Alias-V2/` | **Mobile app** (the product) — the Alias game (Expo / React Native). Also holds the product spec and design mockups (below). | [`Alias-V2/CLAUDE.md`](Alias-V2/CLAUDE.md) |
| `Alias-V2-beckend/` | **Backend** — a single NestJS service for optional online features. (Folder name keeps the `beckend` spelling — match it exactly in paths.) | [`Alias-V2-beckend/CLAUDE.md`](Alias-V2-beckend/CLAUDE.md) |
| `packages/contracts/` | **Shared Zod contracts** — the single source of truth for wire shapes, relative-imported by both projects as `../packages/contracts` (`@alias/contracts`). *Scaffolded (tsup-built package; backend depends on it via `file:../packages/contracts`).* | — |
| `Alias-V2/alias-game-requirements-v2.md` | The full product spec. | — |
| `Alias-V2/design/` | Visual mockups (`index.html`, `arcade.html`, `vivid.html`). | — |
| `Alias-V2-beckend/backend-architecture.md` | Backend architecture + rationale. | [`Alias-V2-beckend/backend-architecture.md`](Alias-V2-beckend/backend-architecture.md) |

> **When working in a project, read that project's `CLAUDE.md`** — `Alias-V2/` (mobile) and `Alias-V2-beckend/` (backend) each own their stack, commands, and standards. This file only covers what spans both. The two projects are plain sibling folders (no npm-workspaces tooling); the shared `packages/contracts/` package is consumed via relative-path import (`../packages/contracts`, depended on as `file:../packages/contracts`).

---

## What Alias is

**Alias** is a cross-platform (iOS + Android) **word-guessing party game**. Teams take turns: one player (the *describer*) explains words to teammates without saying the word or its translation, racing a timer; the app scores Correct / Skip / Foul.

- **Mobile** is the product. It is offline-first and the entire core game runs on-device.
- **Backend** is optional infrastructure for v2/v3 extras only: AI pack generation, accounts/publishing, the public catalog, moderation, and OTA content policy.

Launch locales: en, es, fr, de, pt (architected to expand to RTL/CJK). The app UI language is **independent** of the in-game word language.

---

## Cross-cutting invariants (apply to both projects)

1. **Offline-first is a release gate.** No network call may gate gameplay, pack selection, or a word draw. A full game must play in airplane mode on a fresh install. The backend may only ever cause packs to be **written** into local device storage — it is never on the critical path of play. Network failures degrade *softly*: the client normalizes `fetch` rejections into a shared `OFFLINE` error-envelope code and treats it as non-blocking.
2. **One contract source.** Wire shapes are defined once in `packages/contracts/` as Zod schemas. The app imports them for `z.infer` types; the server validates against them (via `nestjs-zod`). Never duplicate or fork a wire shape; never derive it from DB tables. The server re-validates everything — the contract is a *shape* convention, not a security boundary.
3. **Privacy.** No accounts or PII for the core game or any local/AI feature. The *only* PII surface is the optional publishing account (when it lands). All game data, stats, and history stay on-device.
4. **Schema versioning.** Persisted client stores and published server records carry a `schemaVersion` with a migration ladder.

---

## Git & workflow (whole repo)

- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- Small, focused PRs. Run the relevant project's `lint` + `typecheck` + `test` (in `Alias-V2/` and/or `Alias-V2-beckend/`) before pushing — each project has its own gates.
- Don't commit generated files, `node_modules`, build artifacts, or secrets.

## Do NOT (whole repo)

- Put the backend on the critical path of gameplay, pack selection, or a word draw.
- Duplicate or fork a wire shape — define it once in `packages/contracts/`.
- Commit secrets, API keys, or `.env` files.
- Add a dependency without checking its size and (on mobile) native config-plugin impact.

> Project-specific Do-NOTs live in [`Alias-V2/CLAUDE.md`](Alias-V2/CLAUDE.md) and [`Alias-V2-beckend/CLAUDE.md`](Alias-V2-beckend/CLAUDE.md).
