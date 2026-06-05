# @alias/contracts

Shared **Zod** wire-shape contracts — the single source of truth for data crossing the network between the Alias mobile app and backend.

- **Consumed by both** the Expo/React Native app (Metro) and the NestJS backend (via `file:../packages/contracts`).
- **RN-safe:** pure schemas + types only. **No** server-only imports (no NestJS, DB, Redis, AWS/R2, OpenTelemetry, Node built-ins) — enforced by `eslint` (`no-restricted-imports`) and `"types": []` in `tsconfig.json`.
- `zod` is a **peer dependency** so every consumer shares one Zod runtime (schema identity / `instanceof` must hold across the boundary).

## Build

```bash
npm install
npm run build      # tsup -> dist/{index.js,index.cjs,index.d.ts}
npm run dev        # tsup --watch (keep dist fresh while developing the backend)
```

The backend resolves the built `dist` through the `file:../packages/contracts` symlink; its `tsconfig` `paths` overlay points at `src` for editor/typecheck DX. Rebuild (or run `npm run dev`) after changing a schema.

## What's here

| File | Shape |
| --- | --- |
| `src/errors.ts` | The shared error envelope (`ErrorCode`, `ErrorEnvelope`) — every backend failure maps to this. |
| `src/generation.ts` | `GenerationRequest`, `WordCard`, `AiMeta`, `GenerationResponse`. |
| `src/content-policy.ts` | `ContentPolicy` (OTA, served per locale). |
| `src/pack.ts` | Slim `Card` + `Pack` metadata. |
| `src/locale.ts` | Launch `Locale` enum (en/es/fr/de/pt). |

> Wire shapes only. Never derive these from DB tables; the server re-validates everything (the contract is a *shape* convention, not a security boundary).
