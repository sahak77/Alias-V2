/**
 * GameSession persistence (resume-after-kill, spec §8). The full session is the
 * complete on-device state, so we serialize a small envelope to AsyncStorage on
 * every meaningful change and rehydrate it on launch. This is purely local — no
 * network — so the offline-first invariant is unaffected.
 *
 * Mirrors the theme store's manual-persist style (a versioned key, fire-and-
 * forget writes, best-effort reads that fall back to "no resume" on any error).
 * The `cardsById` lookup is NOT serialized: `buildWordPool` assigns deterministic
 * ids (`packId:index`), so rebuilding the pool from the persisted `packs`
 * reproduces the exact same ids the persisted `wordQueue`/`usedWordIds` reference.
 */

import type { Pack } from '@alias/contracts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildWordPool, type GameWordCard } from '@/features/packs';
import type { TeamSetup } from './engine';
import { GAME_SESSION_SCHEMA_VERSION, type GameConfig, type GameSession, type GameStatus } from './types';

const STORAGE_KEY = 'alias.game-session.v1';

const GAME_STATUSES: readonly GameStatus[] = ['setup', 'intro', 'playing', 'roundResult', 'finished'];

/** The serializable envelope written to AsyncStorage. */
interface PersistedGame {
  schemaVersion: number;
  session: GameSession;
  config: GameConfig;
  teams: TeamSetup[];
  packs: Pack[];
  /** Non-null ⇔ the active round was paused when persisted (resume re-enters paused). */
  pausedRemainingMs: number | null;
}

/** The serializable slice of the store handed to {@link persistGame}. */
export interface PersistInput {
  session: GameSession | null;
  config: GameConfig | null;
  teams: TeamSetup[];
  packs: Pack[];
  pausedRemainingMs: number | null;
}

/** Ready-to-set store state returned by {@link loadGame} (pool rebuilt from packs). */
export interface HydratedGame {
  session: GameSession;
  cardsById: Map<string, GameWordCard>;
  config: GameConfig;
  teams: TeamSetup[];
  packs: Pack[];
  pausedRemainingMs: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Migration ladder. Each rung upgrades a persisted blob by exactly one schema
 * version; resume-from-kill must survive a shape change. At v1 the ladder is
 * empty — add `1: (b) => ({ ...b, schemaVersion: 2, /* new defaults *\/ })` when
 * the {@link GameSession} shape next changes.
 */
const MIGRATIONS: Record<number, (blob: Record<string, unknown>) => Record<string, unknown>> = {};

/** Walk the migration ladder up to the current version; null if no path exists. */
function migrate(parsed: unknown): PersistedGame | null {
  if (!isRecord(parsed)) return null;
  let blob = parsed;
  let version = typeof blob.schemaVersion === 'number' ? blob.schemaVersion : -1;
  while (version < GAME_SESSION_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null; // no rung from this version — discard rather than guess
    const before = version;
    blob = step(blob);
    const next = typeof blob.schemaVersion === 'number' ? blob.schemaVersion : before + 1;
    // A rung that fails to advance the version (the classic "forgot to bump")
    // would spin forever inside the launch hydrate gate — bail instead.
    if (next <= before) return null;
    version = next;
  }
  if (version !== GAME_SESSION_SCHEMA_VERSION) return null;
  return isPersistedGame(blob) ? blob : null;
}

/** Structural guard: enough to trust our own writes without deep-validating the engine's invariants. */
function isPersistedGame(blob: unknown): blob is PersistedGame {
  if (!isRecord(blob)) return false;
  const session = blob.session;
  return (
    isRecord(session) &&
    typeof session.status === 'string' &&
    (GAME_STATUSES as readonly string[]).includes(session.status) &&
    isRecord(blob.config) &&
    Array.isArray(blob.teams) &&
    Array.isArray(blob.packs) &&
    blob.packs.length > 0 &&
    (blob.pausedRemainingMs === null || typeof blob.pausedRemainingMs === 'number')
  );
}

/**
 * Persist the current game (fire-and-forget; resolves once written and never
 * rejects). A null/finished session is not resumable, so its key is cleared.
 */
export function persistGame(input: PersistInput): Promise<void> {
  const { session, config } = input;
  if (!session || !config || session.status === 'finished') {
    return AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }
  const payload: PersistedGame = {
    schemaVersion: GAME_SESSION_SCHEMA_VERSION,
    session,
    config,
    teams: input.teams,
    packs: input.packs,
    pausedRemainingMs: input.pausedRemainingMs,
  };
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
}

/** Drop any persisted game (New Game / discard). */
export function clearGame(): Promise<void> {
  return AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

/**
 * Read, migrate, and rebuild a persisted game. Returns null when there is
 * nothing resumable (absent, corrupt, unmigratable, or already finished).
 */
export async function loadGame(): Promise<HydratedGame | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const migrated = migrate(JSON.parse(raw) as unknown);
    if (!migrated) return null;
    if (migrated.session.status === 'finished') {
      void clearGame();
      return null;
    }
    return {
      session: migrated.session,
      cardsById: buildWordPool(migrated.packs).cardsById,
      config: migrated.config,
      teams: migrated.teams,
      packs: migrated.packs,
      pausedRemainingMs: migrated.pausedRemainingMs,
    };
  } catch {
    return null; // corrupt/absent → no resume; defaults apply
  }
}
