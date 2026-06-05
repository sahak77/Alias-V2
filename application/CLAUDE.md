# CLAUDE.md — Alias Mobile App (`/Alias-V2`)

Context and conventions for the **Alias mobile app** (Expo / React Native), which lives in the `Alias-V2/` project folder. Read this with the workspace guide at [`../CLAUDE.md`](../CLAUDE.md); backend conventions are in [`../Alias-V2-beckend/CLAUDE.md`](../Alias-V2-beckend/CLAUDE.md). Keep this file **short, current, and specific** — vague guidance produces vague results.

---

## Project overview

**Alias** is a cross-platform (iOS + Android) **word-guessing party game**. Teams take turns: one player (the *describer*) explains words to teammates without saying the word or its translation, racing a countdown timer; the app scores Correct / Skip / Foul. The full product spec is [`alias-game-requirements-v2.md`](alias-game-requirements-v2.md) (in this folder).

**The defining constraint: offline-first is a hard release gate.** The core game is **pass-and-play on one shared device** and must work with **no network** — a full game must play in airplane mode on a fresh install with only the bundled starter pack. The backend powers only optional v2/v3 extras and may only ever *write* packs into local storage; it must never gate gameplay, pack selection, or a word draw.

---

## Tech stack

| Concern             | Choice                                      | Notes                                              |
| ------------------- | ------------------------------------------- | -------------------------------------------------- |
| Language            | **TypeScript** (strict)                     | No untyped JS files.                               |
| Framework           | **Expo** (SDK 56), New Architecture on      | Hermes engine enabled.                             |
| Routing             | **Expo Router** (file-based)                | Routes live in `app/`.                             |
| Server state        | **TanStack Query** (React Query)            | All network data goes through Query.               |
| Global client state | **Zustand**                                 | UI/session state only — never server data.         |
| Local state         | React `useState` / `useReducer`             | Default to this before reaching for a store.       |
| Forms + validation  | **React Hook Form** + **Zod**               | One Zod schema per form; infer types from it.      |
| Styling             | `StyleSheet.create` + theme tokens          | Pull from `src/theme/` — no hardcoded values.      |
| Lists               | **FlashList** (`@shopify/flash-list`)       | For anything scrollable beyond a handful of items. |
| Images              | **expo-image**                              | Caching + performance over `<Image>`.              |
| Animations          | **react-native-reanimated**                 | Runs on the UI thread.                             |
| Testing             | **Jest** + **React Native Testing Library** | E2E with **Maestro**.                              |
| Lint / format       | **ESLint** (flat config) + **Prettier**     | Type-check with `tsc`.                             |

---

## Commands

```bash
# from /Alias-V2
npm install                 # install

npx expo start              # dev server + QR code
npx expo start --ios        # open iOS simulator
npx expo start --android    # open Android emulator
npx expo run:ios            # native build (after adding native modules)

npm run lint                # eslint
npm run typecheck           # tsc --noEmit
npm test                    # jest
npm run format              # prettier --write .
npx maestro test .maestro/  # E2E flows
eas build --platform ios    # production build via EAS
```

**Always run `lint`, `typecheck`, and `test` after making changes** and fix what you break before finishing.

---

## Project structure

Feature-first. Screens are thin; logic lives in features. `app/` holds routes only.

```
Alias-V2/
├── app/                        # Expo Router routes — screens ONLY, default exports required
│   ├── (tabs)/                 # Tab group
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── _layout.tsx             # Root layout (providers go here)
│   └── +not-found.tsx
├── src/
│   ├── components/             # Shared, presentational, reusable components
│   │   └── ui/                 # Primitives: Button, Text, Card, Input...
│   ├── features/               # Self-contained feature modules
│   │   └── auth/
│   │       ├── components/     # Feature-specific UI
│   │       ├── hooks/          # useLogin, useSession...
│   │       ├── api/            # Query/mutation hooks + endpoints
│   │       ├── schemas.ts      # Zod schemas
│   │       └── store.ts        # Feature Zustand store (if needed)
│   ├── hooks/                  # Cross-feature hooks
│   ├── lib/                    # Clients & config (apiClient, queryClient, storage, config)
│   ├── stores/                 # Global Zustand stores
│   ├── theme/                  # Design tokens: colors, spacing, typography, radii
│   ├── types/                  # Shared types
│   └── utils/                  # Pure, side-effect-free helpers
├── assets/                     # Fonts, images, icons
├── design/                     # Visual mockups (index.html, arcade.html, vivid.html)
├── alias-game-requirements-v2.md  # Full product spec
├── app.config.ts               # Expo config (typed)
└── tsconfig.json
```

**Rule:** if code is used by one feature, it lives in that feature. Promote to `src/components` or `src/hooks` only when a second feature needs it.

---

## Coding standards

### TypeScript

- `strict: true`. **Never use `any`** — use `unknown` and narrow, or define the type.
- No `@ts-ignore` / `@ts-expect-error` without a one-line comment explaining why.
- Prefer `type` for unions/aliases, `interface` for object shapes that may be extended.
- Derive form/types from Zod: `type LoginInput = z.infer<typeof loginSchema>`.

### Components

- **Functional components only.** No class components.
- **Named exports everywhere** — except files in `app/`, where Expo Router requires a `default export`.
- Keep components small and focused. Extract logic into hooks; extract sub-trees into child components.
- Co-locate styles with `StyleSheet.create` at the bottom of the file.
- Pull values (colors, spacing, fonts) from `theme/` tokens — **no magic numbers or hardcoded hex in components**.

### Naming & imports

- Components: `PascalCase.tsx`. Hooks: `useCamelCase.ts`. Utils: `camelCase.ts`.
- Use the `@/` path alias for absolute imports — no `../../../` chains.
  ```jsonc
  // tsconfig.json
  { "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] } } }
  ```

### Canonical component pattern

```tsx
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { theme } from '@/theme';

type ProfileCardProps = {
  name: string;
  onPress: () => void;
};

export function ProfileCard({ name, onPress }: ProfileCardProps) {
  return (
    <View style={styles.container} accessibilityRole="button" onTouchEnd={onPress}>
      <Text variant="title">{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
  },
});
```

---

## State management

- **Local state** → `useState`/`useReducer`. This is the default.
- **Server state** → TanStack Query. Cache, loading, and error states come from Query — don't reinvent them.
- **Global client state** → Zustand (auth/session, theme, feature flags). Keep stores small and sliced.
- **Never store server data in Zustand.** If it comes from the network, it belongs in Query.

---

## Networking (and the backend seam)

One typed client in `src/lib/apiClient.ts` (base URL from `src/lib/config.ts`). Every call is wrapped in a Query/mutation hook inside the relevant feature's `api/` folder. Components consume hooks, never `fetch` directly.

- **Types come from the shared contracts** (`../packages/contracts`, the `@alias/contracts` Zod package), not hand-written per call site. Import the Zod schemas / `z.infer` types — never duplicate or fork a wire shape.
- **Offline-first enforcement lives here.** `apiClient` must normalize `fetch` rejections (and the `https://api.example.com` default base URL on a fresh airplane-mode install) into the shared `OFFLINE` / `NETWORK_UNAVAILABLE` envelope code. Every optional-feature call site treats that as a soft, non-blocking state — **never** an error that reaches gameplay UI.
- Always handle `isLoading` and `isError` in the UI. Use stable, structured query keys.

```ts
// src/features/profile/api/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export function useProfile(id: string) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: () => apiClient.get<Profile>(`/users/${id}`),
  });
}
```

---

## Styling

- `StyleSheet.create` for all styles; reference `theme/` tokens.
- No inline style objects that contain theme values (creates a new object every render).
- Support light/dark via the theme; respect the OS color scheme.
- Use `SafeAreaView` / `useSafeAreaInsets` for edge spacing.

---

## Performance

- Lists: **FlashList** (or `FlatList`) with `keyExtractor`. **Never `.map()` large arrays inside a `ScrollView`.**
- Memoize intentionally: `React.memo` for pure leaf components, `useCallback`/`useMemo` for values passed to memoized children or deps — not everywhere.
- Avoid creating functions/objects inline in hot render paths.
- Animations on the UI thread via Reanimated; avoid heavy work in the JS thread during gestures.
- Images via `expo-image` with explicit sizes and caching.
- Keep New Architecture + Hermes enabled.
- **Timer correctness** (the game's hot path): drive round length from an absolute `roundEndTimestamp`, not accumulated intervals; a single UI ticker computes remaining time — see [`alias-game-requirements-v2.md` §8](alias-game-requirements-v2.md).

---

## Accessibility

- Every interactive element has `accessibilityRole` and a meaningful `accessibilityLabel`.
- Touch targets ≥ 44×44 pt (use `hitSlop` for small icons).
- Support dynamic font sizes; don't hardcode font scaling off.
- Meet WCAG AA contrast using theme tokens. Use color **plus** icon (not color alone) for Correct vs Skip.

---

## Testing

- **Behavior over implementation.** Query by role/text/label, not test IDs where avoidable.
- Co-locate tests as `Component.test.tsx`, or place them in `__tests__/`.
- Cover: critical user flows, edge/error states, and pure utils (timer, scoring, word-draw-without-repeat).
- E2E happy paths with Maestro in `.maestro/`. Include the **airplane-mode end-to-end** flow — it's a release gate.

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProfileCard } from './ProfileCard';

it('calls onPress when tapped', () => {
  const onPress = jest.fn();
  render(<ProfileCard name="Ada" onPress={onPress} />);
  fireEvent.press(screen.getByText('Ada'));
  expect(onPress).toHaveBeenCalled();
});
```

---

## Environment & secrets

- Config in `app.config.ts`; read values via `expo-constants`.
- Secrets through **EAS Secrets** / environment variables — **never commit `.env` or keys**.
- `.env*` is git-ignored. Public, non-sensitive config can use `EXPO_PUBLIC_` vars.

---

## Do NOT

- Use `any`, or suppress TS/lint errors without a justifying comment.
- Let any network call gate gameplay, pack selection, or a word draw (offline-first is a release gate).
- Store server data in Zustand (use TanStack Query).
- Duplicate or fork a wire shape — import it from `../packages/contracts`.
- Hardcode colors, spacing, or font sizes in components (use `theme/`).
- Render long lists with `.map()` inside a `ScrollView`.
- Add a dependency without checking its size and native (config-plugin) impact.
- Leave `console.log` in committed code.
- Put business logic in `app/` route files — keep screens thin.
- Commit secrets, API keys, or `.env` files.
