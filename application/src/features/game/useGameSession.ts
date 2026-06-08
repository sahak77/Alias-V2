/**
 * The live game store: a thin Zustand wrapper that holds the current
 * {@link GameSession}, the word lookup for the active pool, and dispatches the
 * pure engine transitions with the wall clock. UI-only state — the engine stays
 * pure and testable; this just supplies `Date.now()` and React reactivity.
 *
 * Persistence (resume-after-kill, spec §8) is wired here: every meaningful
 * transition is mirrored to AsyncStorage via {@link persistGame}, and
 * {@link hydrate} restores an interrupted game on launch. Pause/resume is a
 * lifecycle concern (wall-clock re-anchoring), so it lives in this glue rather
 * than the pure engine — the engine's status stays `'playing'` throughout.
 */

import type { Pack } from '@alias/contracts';
import { create } from 'zustand';
import { buildWordPool, type GameWordCard } from '@/features/packs';
import {
  continueAfterResult,
  createSession,
  endRound,
  mark,
  startRound,
  undoLast,
  type TeamSetup,
} from './engine';
import { clearGame, loadGame, persistGame } from './persistence';
import { remainingMs, resumeEndTimestamp } from './timer';
import type { GameConfig, GameSession, WordOutcome } from './types';

/** The active round's full length in ms (sudden-death rounds use their own duration). */
function fullRoundMs(session: GameSession): number {
  const durationSec = session.currentRound?.suddenDeath
    ? session.config.suddenDeathDurationSec
    : session.config.roundDurationSec;
  return durationSec * 1000;
}

interface GameSessionStore {
  session: GameSession | null;
  /** Card lookup for the active pool — render the current word by id. */
  cardsById: Map<string, GameWordCard>;
  // Remembered so "Restart" can rebuild the same game with a fresh shuffle.
  config: GameConfig | null;
  teams: TeamSetup[];
  packs: Pack[];
  /** Non-null ⇔ the active round is paused; holds the ms left when it was frozen. */
  pausedRemainingMs: number | null;
  /** True once the persisted session has been read on launch (or the read failed). */
  isHydrated: boolean;

  /** Build the pool and create a fresh session at the Game Intro. */
  startGame: (config: GameConfig, teams: TeamSetup[], packs: Pack[]) => void;
  beginRound: () => void;
  markWord: (outcome: WordOutcome) => void;
  undo: () => void;
  finishRound: () => void;
  next: () => void;
  /** Replay with the same teams/config and a freshly shuffled pool. */
  restart: () => void;
  /** Discard the session (New Game). */
  quit: () => void;
  /** Read any persisted in-progress game on launch; an interrupted round re-enters paused. */
  hydrate: () => Promise<void>;
  /** Freeze the active round, capturing the remaining time (app left the foreground). */
  pause: () => void;
  /** Re-anchor the round end from the captured remaining time and resume play. */
  resume: () => void;
}

export const useGameSession = create<GameSessionStore>((set, get) => {
  /** Mirror the current serializable state to storage (fire-and-forget). */
  function save(): void {
    const { session, config, teams, packs, pausedRemainingMs } = get();
    void persistGame({ session, config, teams, packs, pausedRemainingMs });
  }

  function build(config: GameConfig, teams: TeamSetup[], packs: Pack[]): void {
    const pool = buildWordPool(packs);
    const session = createSession({
      config,
      teams,
      poolWordIds: pool.wordIds,
      now: Date.now(),
    });
    set({ session, cardsById: pool.cardsById, config, teams, packs, pausedRemainingMs: null });
    save();
  }

  /** Apply a pure engine transition to the current session, if any. */
  function apply(fn: (session: GameSession) => GameSession): void {
    const { session } = get();
    if (!session) return;
    set({ session: fn(session) });
    save();
  }

  return {
    session: null,
    cardsById: new Map(),
    config: null,
    teams: [],
    packs: [],
    pausedRemainingMs: null,
    isHydrated: false,

    startGame: build,
    beginRound: () => apply((s) => startRound(s, Date.now())),
    markWord: (outcome) => apply((s) => mark(s, outcome, Date.now())),
    undo: () => apply((s) => undoLast(s)),
    finishRound: () => apply((s) => endRound(s, Date.now())),
    next: () => apply((s) => continueAfterResult(s, Date.now())),
    restart: () => {
      const { config, teams, packs } = get();
      if (config) build(config, teams, packs);
    },
    quit: () => {
      set({ session: null, cardsById: new Map(), pausedRemainingMs: null });
      void clearGame();
    },

    hydrate: async () => {
      try {
        const loaded = await loadGame();
        if (loaded) {
          // Resume-from-kill: an interrupted active round re-enters the paused
          // state (spec §13) so the timer never silently resumes. Prefer the
          // remaining captured when the app was backgrounded; if the app was
          // killed while foregrounded (no pause ran) the stored roundEndTimestamp
          // is a stale absolute value that carries no usable remaining, so fall
          // back to the full round length rather than a 0s "instant forfeit".
          const pausedRemainingMs =
            loaded.session.status === 'playing'
              ? loaded.pausedRemainingMs ?? fullRoundMs(loaded.session)
              : null;
          set({
            session: loaded.session,
            cardsById: loaded.cardsById,
            config: loaded.config,
            teams: loaded.teams,
            packs: loaded.packs,
            pausedRemainingMs,
          });
        }
      } finally {
        set({ isHydrated: true });
      }
    },

    pause: () => {
      const { session, pausedRemainingMs } = get();
      if (!session || session.status !== 'playing' || pausedRemainingMs !== null) return;
      if (session.roundEndTimestamp === undefined) return;
      set({ pausedRemainingMs: remainingMs(session.roundEndTimestamp, Date.now()) });
      save();
    },

    resume: () => {
      const { session, pausedRemainingMs } = get();
      if (!session || pausedRemainingMs === null) return;
      const now = Date.now();
      set({
        session: { ...session, roundEndTimestamp: resumeEndTimestamp(now, pausedRemainingMs), updatedAt: now },
        pausedRemainingMs: null,
      });
      save();
    },
  };
});
