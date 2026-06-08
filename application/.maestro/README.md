# Maestro E2E — the offline-first release gate

These flows exercise the app end-to-end. The headline gate, **`offline-full-game.yaml`**,
plays a complete game through to the Winner screen and makes **zero network calls**, so it
must pass with the radio off — that is the offline-first release gate (workspace invariant #1).

| Flow | What it checks |
| --- | --- |
| `smoke.yaml` | Fast: launch → Home → Setup → live gameplay (no timer waits). Good for quick selector/launch validation. |
| `offline-full-game.yaml` | Full game: New game → short rounds → Round Result → **Winner**, with a clear (non-tie) result. |

## Run modes

**1. Dev (Expo Go) — validates the flow + selectors.** Not truly offline (Metro serves the
JS over localhost), so it can't enable airplane mode, but it confirms every tap target and the
full game logic.

```bash
# Metro must be running (npx expo start) and the app loaded in Expo Go on a booted simulator.
maestro test .maestro/smoke.yaml
maestro test .maestro/offline-full-game.yaml
```

**2. Standalone build — the true airplane-mode gate.** The JS is bundled into the app, so it
runs with no Metro and no network:

```bash
npx expo prebuild
npx expo run:ios --configuration Release   # installs am.smartsoft.alias on the simulator
```

Then, in the flow files: set `appId: am.smartsoft.alias`, remove the `openLink` step, and
uncomment `- setAirplaneMode: enabled`. Run `maestro test .maestro/offline-full-game.yaml` —
it must pass with airplane mode on. This is the run wired into CI before release.

## Notes
- Selectors are by visible text / accessibility label (e.g. `Correct`, `Start Game`). Steppers
  are reached by `index` (Round timer = 0, Rounds per team = 1 in Time mode).
- The full-game flow taps **Decrease** 20× per stepper to clamp the timer to 15s and rounds to 1
  from any persisted Setup defaults, keeping the run short and deterministic.
