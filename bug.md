# bug.md — Milestone A lifecycle backbone: simulator verification & open uncertainties

Manual verification pass of the **Milestone A lifecycle backbone** (persistence,
resume-after-kill, background-pause, Paused overlay, leave-while-playing freeze)
on the iOS simulator, plus every behavior I **could not** confirm and the risks
I still hold. Tap-driven flows are recorded as uncertainties with exact manual
repro steps — see the [Environment blocker](#environment-blocker) for why.

- **Date:** 2026-06-08
- **Device:** iPhone 17 Pro · iOS 26.2 (simulator, already booted)
- **Runtime:** Expo Go (`host.exp.Exponent`), Metro `expo start --ios` (SDK 56), theme = `arcade`
- **Method:** `xcrun simctl` (launch / terminate / openurl / screenshot) + a seeded
  AsyncStorage game blob. No code was changed for testing; the seed was removed afterward.

---

## 🔴 Resolved bugs

### B1 — Render crash on pressing any non-ghost button (arcade/vivid themes) · FIXED
**Symptom:** Tapping **Play** (`.bugImages/1.png`) throws `Render Error: Cannot read
property 'forEach' of null` in `processTransform.js` (`_validateTransforms`), stack
through `LinearGradient` → `Button`.

**Why it only fires on press:** `buttonStyles.ts` set `transform: pressed ? [..] :
undefined`. On themes with `decoration.button3d` (arcade/vivid), a press sets the
transform to an array and release sets it back to `undefined`. React Native's style
diff converts a *cleared* transform to `transform: null`, and `processTransform(null)`
throws. So it crashes on the press/release of any non-ghost button — but **not** at
rest, which is why Home and a deep-linked Setup both render fine, and why classic
(no `button3d`) is unaffected. **Pre-existing** in the committed UI primitives
(commit `4196934`), not introduced by the lifecycle work; the active theme is `arcade`.

**Fix:** always emit a valid transform array — `transform: [{ translateY: pressed ?
delta : 0 }]` — so it's never cleared to `null`. Regression test added in
`buttonStyles.test.ts` (asserts the transform is always an array). Gates green
(typecheck/lint/104 tests). **On-device press confirmation is pending a manual tap**
(no tap-automation in this env — see the blocker below); the fixed bundle is reloaded,
so tapping Play/Start Game now exercises it.

### B2 — Leaving an in-progress game (iOS swipe-back) · FIXED (final)
**Original gap (was U7):** only Android hardware back was guarded; the iOS swipe-back
popped the game route uncontrolled, contrary to spec §6.3/§13.

**First attempt → caused B3:** a `useExitConfirm` hook used a navigation `beforeRemove`
guard with `e.preventDefault()` to confirm on both platforms. On native-stack this is
unsupported for the interactive swipe and produced a JS/native desync console error
(`.bugImages/2.png` — "screen 'game' was removed natively but didn't get removed from
JS state… not fully supported in native-stack").

**Final fix (chosen behavior — "swipe leaves, auto-saved"):** removed the guard hook
entirely. Leaving an in-progress game by **any** route (iOS swipe, Android back, nav)
now pops cleanly with no error, and `Gameplay`'s unmount-`pause()` freezes the round
and persists it — so it's fully **resumable from Home's "Resume"**. No confirm dialog:
native-stack can't confirm an interactive swipe via public APIs (expo-router doesn't
export `usePreventRemove`), and leaving is non-destructive (nothing is lost), so the
prompt was dropped by design decision. Gates green (typecheck/lint/104 tests).
**Manual check:** swipe back mid-round → no red/console error → lands on Setup, and Home
shows "Resume game" with the round paused at its remaining time.

---

## ✅ Verified on device

| # | Behavior | How | Result |
| - | --- | --- | --- |
| 1 | App boots; hydrate gate releases | cold open → Home | Home renders; no blank-splash hang, no crash. |
| 2 | Hydrate with **empty** storage | `terminate` + `openurl exp://…` | Returns to Home, **no** "Resume" shown (correct), no crash. |
| 3 | **Background → foreground** (no active round) | launch Preferences, then re-launch Expo Go (warm) | Returns to Home intact; `useGameLifecycle` correctly **no-ops** (no overlay, no crash). |
| 4 | Persistence **read path** + Home choices | seed a saved game → relaunch | Home shows **Resume game / New game / Discard saved game / Settings** — hydrate read + migrated + validated the blob and rebuilt the pool. |
| 5 | **Paused overlay** over a live round | deep-link `/--/game` on the seeded (paused) session | Shows **"Paused / 42s left / Resume"** (matches seeded `pausedRemainingMs=42000`). |
| 6 | Round renders correctly under the overlay | (same screenshot) | Team **Red**, **1 pts** (live score from 1 correct mark), word **APPLE** (`seed:1` — proves deterministic `cardId` rebuild from persisted packs), **TimerRing frozen at 0** (clock stopped while paused). |

Screenshots captured under `/tmp/alias-verify/` (01–07). These cover the
persistence read path, the Home conditional, and the Paused overlay render —
the parts unit tests can't reach — on a real device.

---

## ❓ Uncertainties — re-checked 2026-06-08

Re-examined each against the current code. Outcome: **U7 was a real spec gap and
is now fixed (→ B2); U5 resolved by decision; U6 folded into B2.** The rest
(U1–U4, U8–U10) are confirmed **code-correct** — they remain *test-coverage* gaps
(need a tap/real flow this environment can't automate), not defects. Confidence =
my code-level belief; all are unit-tested where noted.

### U1 — Resume tap re-anchors the timer  · risk: medium · confidence: high
Tapping **Resume** on the Paused overlay should set `roundEndTimestamp =
now + pausedRemainingMs` and resume the countdown from 42s. The overlay renders
(verified) but the **tap + re-anchor + live countdown** was not exercised.
- Covered by unit test `useGameSession.test.ts › pause freezes / resume re-anchors`.
- **Manual repro:** from the Paused overlay, tap Resume → timer should start at 42s and count down; actions become usable.

### U2 — Background-pause of a genuinely running round  · risk: medium · confidence: high
I verified background/foreground only at Home (no-op, U3-style), and seeded the
paused state directly. The **end-to-end** "round is running → background the app
→ return → Paused overlay shows captured remaining → never auto-resumes" was not
produced by a real backgrounding of a live round.
- Covered by `useGameLifecycle.test.ts` (AppState→pause wiring) + store tests.
- **Manual repro:** start a game, begin a round, note the time, send app to background (swipe up / lock), reopen → expect Paused overlay at ~the time left, NOT counting; round resumes only on tapping Resume.

### U3 — Full game flow (the whole turn loop)  · risk: medium · confidence: medium
Setup (teams, mode, timer/rounds steppers, validation) → Start → Gameplay
(Correct / Skip / Foul, skip/foul gating, Undo last, auto-end on expiry) →
Round Result → Continue → next team → Winner. None of the tap-driven gameplay
was driven this session (engine logic is unit-tested; the **screen wiring** is not E2E-verified here).
- **Manual repro:** play one full short game (e.g. 15s rounds, 1 round/team) and confirm each screen + scoring.

### U4 — Resume-after-kill of a *real* mid-round game  · risk: medium · confidence: high
I seeded the persisted blob; the **organic** flow (play a round → force-quit the
app → relaunch → Home "Resume" → open → Paused) was not run end-to-end. In
particular, whether `pause()`'s fire-and-forget write reliably flushes before a
real OS kill is unconfirmed (see U8).
- **Manual repro:** play a round, swipe-kill the app from the app switcher, relaunch → expect "Resume game" → Resume → Paused overlay at the captured remaining.

### U5 — Foreground-crash fallback = FULL round  · ✅ DECISION MADE (2026-06-08)
If the app is killed *while foregrounded* mid-round (no background event fired,
so no `pausedRemainingMs` captured), `hydrate` falls back to **re-entering paused
with the full round duration**. **Decision: keep this** (player-friendly; only the
rare hard-foreground-crash path is affected — normal background→kill restores the
exact remaining). Verified by unit test (`pausedRemainingMs === 60_000`). No code change.

### U6 — Hardware/gesture exit  · ✅ RESOLVED (see B2 final)
No confirm dialog (native-stack can't confirm an interactive swipe via public
APIs). Leaving an in-progress game — iOS swipe, Android back, or any nav — pops
cleanly and the `Gameplay` unmount-`pause()` freezes + persists the round.
- **Manual repro:** during a round, swipe back / Android back → no error → lands on Setup; Home shows "Resume game" at the round's remaining time.

### U7 — Leave-while-playing on iOS  · ✅ RESOLVED (see B2 final)
Was: iOS swipe-back popped the game route uncontrolled and (after the first fix)
threw a native-stack desync error. Now the swipe leaves cleanly with no guard;
the unmount-`pause()` makes it non-destructive (auto-saved, resumable from Home).
- **Manual repro (iOS):** during a round, edge-swipe back → no error; land on Setup; the round is paused (not expired) and resumable from Home.

### U8 — pause-write durability across a hard kill  · risk: low · confidence: medium
On background, `pause()` captures the remaining and persists **fire-and-forget**
(`void persistGame`). If the OS kills the app before that write flushes, resume
falls back to U5's full-round path. Acceptable per spec §8 (kill is a weaker
guarantee than the pause cycle), but the exact race window is unmeasured.

### U9 — Migration ladder forward path  · risk: low · confidence: high
The `MIGRATIONS` ladder is currently empty (v1). The loop is now guarded against
the "forgot to bump → infinite boot hang" mistake (strictly-increasing version
check), but a **real v1→v2 migration** can't be tested until a second schema
version exists. Unit tests cover corrupt JSON and an unmigratable version → null.

### U10 — Discard confirm + New game  · risk: low · confidence: high
Home "Discard saved game" → `Alert` → "Discard" should clear storage and remove
the Resume option; "New game" → Setup. Not tapped.
- **Manual repro:** tap Discard → Discard → "Resume" should disappear; relaunch confirms it's gone.

---

## ⚠️ Environment blocker (why the above are uncertainties)

- **No UI tap automation available.** `idb`, `maestro`, `cliclick`, and Python
  `Quartz` are all absent; `cliclick` was installed but **System Events is denied
  Accessibility permission** (`osascript … not allowed assistive access -1719`),
  so synthetic taps/window geometry can't be obtained from this environment.
  Granting Accessibility to the terminal is a manual user action.
- **Consequence:** every tap-driven path above can only be checked by a human on
  the open simulator, or by an automated UI runner.
- **Recommendation:** this is exactly the gap the planned **Maestro airplane-mode
  E2E** (`progress.md` §2.2, the offline-first release gate) is meant to close.
  Standing up `.maestro/` with a "full game offline" flow would make U1–U4, U7,
  U10 regression-proof. (Maestro drives the simulator directly and doesn't need
  the macOS Accessibility grant.)

---

## 🟡 Minor observations (not blocking)

- **O1** — Under the Paused overlay the `TimerRing` reads **0** (frozen, since the
  clock is fed `undefined` while paused). It's fully covered by the scrim so it's
  not user-visible in the normal flow, and it re-anchors correctly on Resume.
  Cosmetic only; could optionally show the paused remaining in the ring.
- **O2** — Discard / Android-back confirms use the **system `Alert`** (unstyled,
  not themed). Fine for v0; revisit if a themed modal is wanted.
- **O3** — The session is persisted on **every word mark** (fire-and-forget). Negligible
  for the 50-word starter pack; revisit write frequency if large multi-packs ship
  (flagged in review, dismissed as non-bug at current scale).

---

## How to reproduce this verification

```bash
# booted sim + running Metro assumed (expo start --ios)
xcrun simctl io booted screenshot /tmp/shot.png          # observe state
xcrun simctl terminate booted host.exp.Exponent          # simulate kill
xcrun simctl openurl   booted "exp://127.0.0.1:8081"     # relaunch (fresh hydrate)
xcrun simctl launch    booted com.apple.Preferences      # background our app
xcrun simctl launch    booted host.exp.Exponent          # warm foreground
# Seed a saved game: write the PersistedGame envelope to the experience's
# RCTAsyncLocalStorage external file (md5 of "alias.game-session.v1") + register
# the key as null in manifest.json, while Expo Go is terminated; then openurl.
```
