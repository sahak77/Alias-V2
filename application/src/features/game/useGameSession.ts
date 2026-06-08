/**
 * The live game store: a thin Zustand wrapper that holds the current
 * {@link GameSession}, the word lookup for the active pool, and dispatches the
 * pure engine transitions with the wall clock. UI-only state — the engine stays
 * pure and testable; this just supplies `Date.now()` and React reactivity.
 *
 * Persistence (resume-after-kill) is intentionally not here yet — that lands in
 * the lifecycle step; the offline-first invariant is unaffected (no network).
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
import type { GameConfig, GameSession, WordOutcome } from './types';

interface GameSessionStore {
  session: GameSession | null;
  /** Card lookup for the active pool — render the current word by id. */
  cardsById: Map<string, GameWordCard>;
  // Remembered so "Restart" can rebuild the same game with a fresh shuffle.
  config: GameConfig | null;
  teams: TeamSetup[];
  packs: Pack[];

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
}

export const useGameSession = create<GameSessionStore>((set, get) => {
  function build(config: GameConfig, teams: TeamSetup[], packs: Pack[]): void {
    const pool = buildWordPool(packs);
    const session = createSession({
      config,
      teams,
      poolWordIds: pool.wordIds,
      now: Date.now(),
    });
    set({ session, cardsById: pool.cardsById, config, teams, packs });
  }

  /** Apply a pure engine transition to the current session, if any. */
  function apply(fn: (session: GameSession) => GameSession): void {
    const { session } = get();
    if (!session) return;
    set({ session: fn(session) });
  }

  return {
    session: null,
    cardsById: new Map(),
    config: null,
    teams: [],
    packs: [],

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
    quit: () => set({ session: null, cardsById: new Map() }),
  };
});
