/**
 * The Alias rules engine (spec §4): a set of pure transitions over a
 * {@link GameSession}. Every function takes the current session (plus an
 * explicit `now`/`rng` where needed) and returns a NEW session — no mutation,
 * no clock access, no randomness of its own. This keeps the whole engine
 * deterministic and exhaustively unit-testable, and lets a thin Zustand store
 * or `useReducer` drive it from the screens.
 *
 * Flow:  createSession → [ startRound → mark* (→ undoLast) → endRound →
 *        continueAfterResult ]*  → status 'finished'
 */

import { applyDelta, roundDelta, type RoundCounts } from './scoring';
import { drawNext, shuffle, type Rng } from './wordDraw';
import { roundEndTimestamp } from './timer';
import {
  GAME_SESSION_SCHEMA_VERSION,
  type GameConfig,
  type GameSession,
  type InProgressRound,
  type RoundResult,
  type Team,
  type WordMark,
  type WordOutcome,
} from './types';

/** Thrown on an invalid transition or invalid setup. */
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 8;

/** Minimal team info needed to start a game; counters are initialized to 0. */
export interface TeamSetup {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

/** Spec-default config (§3, §6.1), overridable field-by-field. */
export function defaultGameConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    mode: 'time',
    describeMode: 'describe',
    roundDurationSec: 60,
    correctScore: 1,
    skipScore: 0,
    foulScore: -1,
    roundCount: 3,
    allowNegativeTotals: true,
    buzzerRule: 'hardStop',
    finishRotationOnMax: true,
    tieBreak: 'suddenDeath',
    wordPackIds: [],
    contentFilter: 'standard',
    wordLocales: ['en'],
    suddenDeathDurationSec: 30,
    ...overrides,
  };
}

export interface ValidateSetupParams {
  config: GameConfig;
  teams: TeamSetup[];
  poolSize: number;
}

/**
 * Setup validation (spec §6.1). Returns a list of human-readable issues; an
 * empty list means the game can start. {@link createSession} throws if any.
 */
export function validateSetup({ config, teams, poolSize }: ValidateSetupParams): string[] {
  const issues: string[] = [];
  if (teams.length < MIN_TEAMS) issues.push(`at least ${MIN_TEAMS} teams are required`);
  if (teams.length > MAX_TEAMS) issues.push(`at most ${MAX_TEAMS} teams are allowed`);
  if (teams.some((t) => t.name.trim().length === 0)) issues.push('every team needs a name');
  if (config.roundDurationSec <= 0) issues.push('round duration must be greater than 0');
  if (config.correctScore <= 0) issues.push('correct score must be positive');
  if (config.skipScore > 0) issues.push('skip score must be 0 or negative');
  if (config.foulScore !== undefined && config.foulScore > 0) {
    issues.push('foul score must be 0 or negative');
  }
  if (config.mode === 'max' && !(typeof config.maxScore === 'number' && config.maxScore > 0)) {
    issues.push('max score is required in Max Score mode');
  }
  if (config.mode === 'time' && !(typeof config.roundCount === 'number' && config.roundCount >= 1)) {
    issues.push('round count is required in Time Score mode');
  }
  if (poolSize < 1) issues.push('at least one word is required');
  return issues;
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

export interface CreateSessionParams {
  config: GameConfig;
  teams: TeamSetup[];
  /** Ids of every word in the combined, deduped pool for this game. */
  poolWordIds: string[];
  now: number;
  rng?: Rng;
}

/** Build a fresh session sitting at the Game Intro for the first team. */
export function createSession(params: CreateSessionParams): GameSession {
  const { config, teams, poolWordIds, now, rng } = params;
  const issues = validateSetup({ config, teams, poolSize: poolWordIds.length });
  if (issues.length > 0) {
    throw new GameError(`invalid game setup: ${issues.join('; ')}`);
  }
  return {
    schemaVersion: GAME_SESSION_SCHEMA_VERSION,
    config,
    teams: teams.map(initTeam),
    rounds: [],
    currentTeamIndex: 0,
    wordQueue: shuffle(poolWordIds, rng),
    usedWordIds: [],
    currentRound: undefined,
    roundEndTimestamp: undefined,
    status: 'intro',
    winnerTeamIds: [],
    suddenDeath: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/** Begin the active team's round: anchor the timer and draw the first word. */
export function startRound(session: GameSession, now: number, rng?: Rng): GameSession {
  if (session.status !== 'intro') {
    throw new GameError(`startRound requires status 'intro', got '${session.status}'`);
  }
  const team = requireActiveTeam(session);
  const isSuddenDeath = session.suddenDeath !== undefined;
  const durationSec = isSuddenDeath
    ? session.config.suddenDeathDurationSec
    : session.config.roundDurationSec;
  const { wordId, wordQueue } = drawNext(session.wordQueue, session.usedWordIds, null, rng);
  return {
    ...session,
    wordQueue,
    roundEndTimestamp: roundEndTimestamp(now, durationSec),
    currentRound: {
      teamId: team.id,
      index: team.roundsPlayed,
      marks: [],
      currentWordId: wordId,
      suddenDeath: isSuddenDeath,
    },
    status: 'playing',
    updatedAt: now,
  };
}

/**
 * Resolve the word on screen (correct/skip/foul) and advance to the next word.
 * Enforces the skip limit and foul-enabled rules at the engine level; a
 * disallowed action is a no-op so the UI and engine can never disagree.
 */
export function mark(
  session: GameSession,
  outcome: WordOutcome,
  now: number,
  rng?: Rng,
): GameSession {
  const round = requirePlaying(session);
  const current = round.currentWordId;
  if (current === null) return session; // pool exhausted — nothing to resolve
  if (outcome === 'foul' && session.config.foulScore === undefined) return session;
  if (outcome === 'skip' && !canSkip(session)) return session;

  const marks: WordMark[] = [...round.marks, { wordId: current, outcome }];
  const usedWordIds = session.usedWordIds.includes(current)
    ? session.usedWordIds
    : [...session.usedWordIds, current];
  const { wordId: next, wordQueue } = drawNext(session.wordQueue, usedWordIds, current, rng);

  return {
    ...session,
    usedWordIds,
    wordQueue,
    currentRound: { ...round, marks, currentWordId: next },
    updatedAt: now,
  };
}

/** Revert the most recent mark and restore the word that was on screen (spec §6.3). */
export function undoLast(session: GameSession): GameSession {
  const round = requirePlaying(session);
  const last = round.marks[round.marks.length - 1];
  if (last === undefined) return session;

  const marks = round.marks.slice(0, -1);
  // The freshly drawn word goes back to the front of the queue (undo the draw).
  const wordQueue =
    round.currentWordId !== null ? [round.currentWordId, ...session.wordQueue] : session.wordQueue;

  return {
    ...session,
    wordQueue,
    usedWordIds: recomputeUsed(session.rounds, marks),
    currentRound: { ...round, marks, currentWordId: last.wordId },
  };
}

/**
 * End the round: snapshot a {@link RoundResult}, apply the delta to the team
 * (normal rounds) or record it as a tie-break delta (sudden death), and return
 * the unresolved word to the queue so the hard-stop rule loses points, not words.
 */
export function endRound(session: GameSession, now: number): GameSession {
  const round = requirePlaying(session);
  const counts = countMarks(round.marks);
  const delta = roundDelta(counts, session.config);
  const durationSec = round.suddenDeath
    ? session.config.suddenDeathDurationSec
    : session.config.roundDurationSec;

  const result: RoundResult = {
    teamId: round.teamId,
    index: round.index,
    correctWordIds: round.marks.filter((m) => m.outcome === 'correct').map((m) => m.wordId),
    skippedWordIds: round.marks.filter((m) => m.outcome === 'skip').map((m) => m.wordId),
    fouledWordIds: round.marks.filter((m) => m.outcome === 'foul').map((m) => m.wordId),
    scoreDelta: delta,
    durationUsedSec: computeDurationUsed(session.roundEndTimestamp, durationSec, now),
    suddenDeath: round.suddenDeath,
  };

  const wordQueue =
    round.currentWordId !== null ? [round.currentWordId, ...session.wordQueue] : session.wordQueue;

  let teams = session.teams;
  let suddenDeath = session.suddenDeath;
  if (round.suddenDeath) {
    // Tie-break rounds decide ordering by delta and never touch the totals.
    if (suddenDeath) {
      suddenDeath = { ...suddenDeath, deltas: { ...suddenDeath.deltas, [round.teamId]: delta } };
    }
  } else {
    teams = session.teams.map((t) =>
      t.id === round.teamId
        ? applyRoundToTeam(t, counts, delta, session.config.allowNegativeTotals)
        : t,
    );
  }

  return {
    ...session,
    teams,
    rounds: [...session.rounds, result],
    wordQueue,
    currentRound: undefined,
    roundEndTimestamp: undefined,
    suddenDeath,
    status: 'roundResult',
    updatedAt: now,
  };
}

/**
 * From the Round Result, decide the next step (spec §6.4): hand off to the next
 * team, finish with a single winner, or enter/continue sudden death on a tie.
 */
export function continueAfterResult(session: GameSession, now: number): GameSession {
  if (session.status !== 'roundResult') {
    throw new GameError(`continue requires status 'roundResult', got '${session.status}'`);
  }
  if (session.suddenDeath !== undefined) return continueSuddenDeath(session, now);

  if (!isGameOver(session)) {
    return { ...session, currentTeamIndex: nextTeamIndex(session), status: 'intro', updatedAt: now };
  }
  const leaders = topScoringTeamIds(session.teams);
  if (leaders.length <= 1) {
    return { ...session, status: 'finished', winnerTeamIds: leaders, updatedAt: now };
  }
  return enterSuddenDeath(session, leaders, now);
}

// ---------------------------------------------------------------------------
// Reducer (ergonomic wrapper for stores / useReducer)
// ---------------------------------------------------------------------------

export type GameAction =
  | { type: 'startRound'; now: number; rng?: Rng }
  | { type: 'mark'; outcome: WordOutcome; now: number; rng?: Rng }
  | { type: 'undo' }
  | { type: 'endRound'; now: number }
  | { type: 'continue'; now: number };

export function gameReducer(session: GameSession, action: GameAction): GameSession {
  switch (action.type) {
    case 'startRound':
      return startRound(session, action.now, action.rng);
    case 'mark':
      return mark(session, action.outcome, action.now, action.rng);
    case 'undo':
      return undoLast(session);
    case 'endRound':
      return endRound(session, action.now);
    case 'continue':
      return continueAfterResult(session, action.now);
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// Selectors (read-only helpers for screens)
// ---------------------------------------------------------------------------

export function activeTeam(session: GameSession): Team | undefined {
  return session.teams[session.currentTeamIndex];
}

export function countMarks(marks: readonly WordMark[]): RoundCounts {
  let correct = 0;
  let skip = 0;
  let foul = 0;
  for (const m of marks) {
    if (m.outcome === 'correct') correct += 1;
    else if (m.outcome === 'skip') skip += 1;
    else foul += 1;
  }
  return { correct, skip, foul };
}

export function currentRoundCounts(session: GameSession): RoundCounts {
  return session.currentRound
    ? countMarks(session.currentRound.marks)
    : { correct: 0, skip: 0, foul: 0 };
}

export function currentRoundDelta(session: GameSession): number {
  return roundDelta(currentRoundCounts(session), session.config);
}

/** Team total, plus the active (non-sudden-death) team's live in-round delta. */
export function liveTeamScore(session: GameSession, teamId: string): number {
  const team = session.teams.find((t) => t.id === teamId);
  if (!team) return 0;
  const round = session.currentRound;
  if (session.status === 'playing' && round && !round.suddenDeath && round.teamId === teamId) {
    return team.score + currentRoundDelta(session);
  }
  return team.score;
}

/** Skips left this round, or null when unlimited. */
export function remainingSkips(session: GameSession): number | null {
  const limit = session.config.skipLimit;
  if (limit === undefined) return null;
  const used = session.currentRound ? countMarks(session.currentRound.marks).skip : 0;
  return Math.max(0, limit - used);
}

export function canSkip(session: GameSession): boolean {
  const remaining = remainingSkips(session);
  return remaining === null || remaining > 0;
}

export function canFoul(session: GameSession): boolean {
  return session.config.foulScore !== undefined;
}

export function isFinished(session: GameSession): boolean {
  return session.status === 'finished';
}

export function winner(session: GameSession): Team | undefined {
  const id = session.winnerTeamIds[0];
  return id !== undefined ? session.teams.find((t) => t.id === id) : undefined;
}

/** Teams ranked highest score first (for the Winner scoreboard). */
export function rankedTeams(session: GameSession): Team[] {
  return [...session.teams].sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function initTeam(t: TeamSetup): Team {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    avatar: t.avatar,
    score: 0,
    roundsPlayed: 0,
    totalCorrect: 0,
    totalSkipped: 0,
    totalFouls: 0,
  };
}

function applyRoundToTeam(
  team: Team,
  counts: RoundCounts,
  delta: number,
  allowNegativeTotals: boolean,
): Team {
  return {
    ...team,
    score: applyDelta(team.score, delta, allowNegativeTotals),
    roundsPlayed: team.roundsPlayed + 1,
    totalCorrect: team.totalCorrect + counts.correct,
    totalSkipped: team.totalSkipped + counts.skip,
    totalFouls: team.totalFouls + counts.foul,
  };
}

function requireActiveTeam(session: GameSession): Team {
  const team = activeTeam(session);
  if (!team) throw new GameError(`no active team at index ${session.currentTeamIndex}`);
  return team;
}

function requirePlaying(session: GameSession): InProgressRound {
  if (session.status !== 'playing' || !session.currentRound) {
    throw new GameError(`action requires status 'playing', got '${session.status}'`);
  }
  return session.currentRound;
}

function recomputeUsed(rounds: readonly RoundResult[], currentMarks: readonly WordMark[]): string[] {
  const ids = new Set<string>();
  for (const r of rounds) {
    for (const id of r.correctWordIds) ids.add(id);
    for (const id of r.skippedWordIds) ids.add(id);
    for (const id of r.fouledWordIds) ids.add(id);
  }
  for (const m of currentMarks) ids.add(m.wordId);
  return [...ids];
}

function computeDurationUsed(
  endTimestamp: number | undefined,
  durationSec: number,
  now: number,
): number {
  if (endTimestamp === undefined) return durationSec;
  const startTs = endTimestamp - durationSec * 1000;
  const usedSec = Math.round((now - startTs) / 1000);
  return Math.min(durationSec, Math.max(0, usedSec));
}

function nextTeamIndex(session: GameSession): number {
  return (session.currentTeamIndex + 1) % session.teams.length;
}

function isRotationBoundary(session: GameSession): boolean {
  return (session.currentTeamIndex + 1) % session.teams.length === 0;
}

function isGameOver(session: GameSession): boolean {
  const { config, teams } = session;
  if (config.mode === 'time') {
    const target = config.roundCount ?? 0;
    return teams.every((t) => t.roundsPlayed >= target);
  }
  // Max Score
  const target = config.maxScore ?? Number.POSITIVE_INFINITY;
  const reached = teams.some((t) => t.score >= target);
  if (!reached) return false;
  return config.finishRotationOnMax ? isRotationBoundary(session) : true;
}

function topScoringTeamIds(teams: readonly Team[]): string[] {
  const top = teams.reduce((max, t) => Math.max(max, t.score), Number.NEGATIVE_INFINITY);
  return teams.filter((t) => t.score === top).map((t) => t.id);
}

function enterSuddenDeath(session: GameSession, contenderIds: string[], now: number): GameSession {
  const firstId = contenderIds[0];
  const idx = firstId !== undefined ? session.teams.findIndex((t) => t.id === firstId) : -1;
  return {
    ...session,
    suddenDeath: { contenderIds, deltas: {} },
    currentTeamIndex: idx >= 0 ? idx : session.currentTeamIndex,
    status: 'intro',
    winnerTeamIds: [],
    updatedAt: now,
  };
}

function continueSuddenDeath(session: GameSession, now: number): GameSession {
  const sd = session.suddenDeath;
  if (!sd) throw new GameError('continueSuddenDeath called without sudden-death state');

  const remaining = sd.contenderIds.filter((id) => !(id in sd.deltas));
  if (remaining.length > 0) {
    const nextId = remaining[0];
    const idx = nextId !== undefined ? session.teams.findIndex((t) => t.id === nextId) : -1;
    return {
      ...session,
      currentTeamIndex: idx >= 0 ? idx : session.currentTeamIndex,
      status: 'intro',
      updatedAt: now,
    };
  }

  // Whole sudden-death rotation played — highest delta advances.
  const maxDelta = sd.contenderIds.reduce(
    (max, id) => Math.max(max, sd.deltas[id] ?? Number.NEGATIVE_INFINITY),
    Number.NEGATIVE_INFINITY,
  );
  const winners = sd.contenderIds.filter((id) => (sd.deltas[id] ?? Number.NEGATIVE_INFINITY) === maxDelta);
  if (winners.length <= 1) {
    return {
      ...session,
      status: 'finished',
      winnerTeamIds: winners,
      suddenDeath: undefined,
      updatedAt: now,
    };
  }
  return enterSuddenDeath(session, winners, now);
}
