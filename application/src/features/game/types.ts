/**
 * Local domain model for the Alias core game (pass-and-play, on one device).
 *
 * These types are **not** wire shapes — gameplay state never crosses the
 * network, so it lives here in the app rather than in `@alias/contracts`. The
 * contract's slim `Pack`/`Card` shapes remain the serialization boundary for
 * packs; everything below (config, teams, rounds, the live session) is purely
 * on-device. See `alias-game-requirements-v2.md` §5.
 */

/**
 * Schema version stamped on every persisted {@link GameSession}. Bump when the
 * shape changes and add a migration step; resume-from-kill must survive it.
 */
export const GAME_SESSION_SCHEMA_VERSION = 1;

export type GameMode = 'time' | 'max';
export type DescribeMode = 'describe' | 'taboo' | 'charades' | 'oneWord' | 'hum';
export type BuzzerRule = 'hardStop' | 'finishWord';
export type TieBreak = 'suddenDeath';
export type ContentFilter = 'standard' | 'adult';

/** The outcome of resolving the word currently on screen. */
export type WordOutcome = 'correct' | 'skip' | 'foul';

export type GameStatus = 'setup' | 'intro' | 'playing' | 'roundResult' | 'finished';

/** Authoritative game configuration chosen on the Setup screen (spec §5). */
export interface GameConfig {
  mode: GameMode;
  describeMode: DescribeMode;
  /** Round length in seconds; > 0. */
  roundDurationSec: number;
  /** Points per correct word; positive (spec default +1). */
  correctScore: number;
  /** Points per skip; <= 0 (default 0). */
  skipScore: number;
  /** Points per foul; <= 0 (default -1). Omitted ⇒ foul disabled. */
  foulScore?: number;
  /** Target score; required when `mode === 'max'`. */
  maxScore?: number;
  /** Rounds **per team**; required when `mode === 'time'`. */
  roundCount?: number;
  /** Max skips per round; omitted ⇒ unlimited. */
  skipLimit?: number;
  /** Whether a team total may go negative (no clamp-to-zero). Default true. */
  allowNegativeTotals: boolean;
  buzzerRule: BuzzerRule;
  /** Max-mode fairness: finish the rotation before declaring a winner. */
  finishRotationOnMax: boolean;
  tieBreak: TieBreak;
  /** Selected pack ids. Device provenance lives with the pack store, not here. */
  wordPackIds: string[];
  contentFilter: ContentFilter;
  /** BCP-47 word language(s) for this game; `length > 1` ⇒ bilingual. */
  wordLocales: string[];
  /** Round length used for sudden-death tie-break rounds. */
  suddenDeathDurationSec: number;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  score: number;
  roundsPlayed: number;
  totalCorrect: number;
  totalSkipped: number;
  totalFouls: number;
}

/** A single resolved word within the active round, kept in tap order. */
export interface WordMark {
  wordId: string;
  outcome: WordOutcome;
}

/**
 * Mutable per-round accumulator; present only while `status === 'playing'`.
 * `marks` is the source of truth for live scoring and undo — counters are
 * always derived from it, never tracked separately (spec §6.4).
 */
export interface InProgressRound {
  teamId: string;
  /** 0-based index of this round for the active team. */
  index: number;
  marks: WordMark[];
  /** The word on screen awaiting an outcome; null when the pool is exhausted. */
  currentWordId: string | null;
  /** True while this is a sudden-death tie-break round. */
  suddenDeath: boolean;
}

/** Immutable record of a completed round (spec §5 `RoundResult`). */
export interface RoundResult {
  teamId: string;
  index: number;
  correctWordIds: string[];
  skippedWordIds: string[];
  fouledWordIds: string[];
  scoreDelta: number;
  durationUsedSec: number;
  suddenDeath: boolean;
}

/** Tie-break bookkeeping: contenders and their per-rotation deltas (spec §4.6). */
export interface SuddenDeathState {
  /** Team ids still competing to break the tie. */
  contenderIds: string[];
  /** Per-contender score delta for the current sudden-death rotation. */
  deltas: Record<string, number>;
}

/** The complete, persistable game state (spec §5 `GameSession`). */
export interface GameSession {
  schemaVersion: number;
  config: GameConfig;
  teams: Team[];
  rounds: RoundResult[];
  currentTeamIndex: number;
  /** Upcoming, not-yet-shown word ids for the current draw cycle. */
  wordQueue: string[];
  /** Word ids already shown this game (stats + reshuffle source). */
  usedWordIds: string[];
  currentRound?: InProgressRound;
  /** Absolute epoch-ms the active round ends — the single timer source of truth. */
  roundEndTimestamp?: number;
  status: GameStatus;
  /** Exactly one winner once finished; ties are broken by sudden death. */
  winnerTeamIds: string[];
  suddenDeath?: SuddenDeathState;
  createdAt: number;
  updatedAt: number;
}
