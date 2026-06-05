import {
  canFoul,
  continueAfterResult,
  createSession,
  currentRoundCounts,
  defaultGameConfig,
  endRound,
  GameError,
  gameReducer,
  isFinished,
  liveTeamScore,
  mark,
  rankedTeams,
  remainingSkips,
  startRound,
  undoLast,
  validateSetup,
  type TeamSetup,
} from './engine';
import type { GameConfig, GameSession, WordOutcome } from './types';
import type { Rng } from './wordDraw';

/** rng just under 1 ⇒ the shuffle is identity, so the queue keeps pool order. */
const idRng: Rng = () => 1 - Number.EPSILON;
const T0 = 1_000;

const TEAMS: TeamSetup[] = [
  { id: 'A', name: 'Alpha', color: '#f00' },
  { id: 'B', name: 'Bravo', color: '#00f' },
];

function setup(opts: { config?: Partial<GameConfig>; teams?: TeamSetup[]; pool?: string[] } = {}): GameSession {
  return createSession({
    config: defaultGameConfig({ roundCount: 1, ...opts.config }),
    teams: opts.teams ?? TEAMS,
    poolWordIds: opts.pool ?? ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'],
    now: T0,
    rng: idRng,
  });
}

/** Start the active team's round, apply outcomes in order, then end it. */
function playRound(session: GameSession, outcomes: WordOutcome[], now = T0): GameSession {
  let s = startRound(session, now, idRng);
  for (const outcome of outcomes) s = mark(s, outcome, now, idRng);
  return endRound(s, now);
}

const scoreOf = (s: GameSession, id: string): number | undefined =>
  s.teams.find((t) => t.id === id)?.score;

describe('createSession & validateSetup', () => {
  it('starts at the Game Intro for the first team with zeroed totals', () => {
    const s = setup();
    expect(s.status).toBe('intro');
    expect(s.currentTeamIndex).toBe(0);
    expect(s.rounds).toEqual([]);
    expect(s.usedWordIds).toEqual([]);
    expect(s.wordQueue).toEqual(['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8']);
    expect(s.teams.map((t) => t.score)).toEqual([0, 0]);
  });

  it('rejects fewer than two teams', () => {
    expect(() => setup({ teams: [{ id: 'A', name: 'Solo', color: '#000' }] })).toThrow(GameError);
  });

  it('rejects an empty pool, a blank team name, and a non-positive correct score', () => {
    expect(validateSetup({ config: defaultGameConfig(), teams: TEAMS, poolSize: 0 })).toContain(
      'at least one word is required',
    );
    expect(
      validateSetup({
        config: defaultGameConfig(),
        teams: [{ id: 'A', name: '  ', color: '#000' }, TEAMS[1] as TeamSetup],
        poolSize: 5,
      }),
    ).toContain('every team needs a name');
    expect(
      validateSetup({ config: defaultGameConfig({ correctScore: 0 }), teams: TEAMS, poolSize: 5 }),
    ).toContain('correct score must be positive');
  });

  it('requires round count in Time mode and max score in Max mode', () => {
    expect(
      validateSetup({ config: defaultGameConfig({ roundCount: undefined }), teams: TEAMS, poolSize: 5 }),
    ).toContain('round count is required in Time Score mode');
    expect(
      validateSetup({
        config: defaultGameConfig({ mode: 'max', maxScore: undefined }),
        teams: TEAMS,
        poolSize: 5,
      }),
    ).toContain('max score is required in Max Score mode');
  });
});

describe('round play', () => {
  it('draws the first word on startRound and advances on each mark', () => {
    const s1 = startRound(setup(), T0, idRng);
    expect(s1.status).toBe('playing');
    expect(s1.currentRound?.currentWordId).toBe('w1');

    const s2 = mark(s1, 'correct', T0, idRng);
    expect(s2.currentRound?.currentWordId).toBe('w2');
    expect(currentRoundCounts(s2)).toEqual({ correct: 1, skip: 0, foul: 0 });
  });

  it('applies the scoring formula on endRound', () => {
    const s = playRound(setup({ config: { skipScore: -1, foulScore: -1 } }), [
      'correct',
      'correct',
      'skip',
      'foul',
    ]);
    // 2*1 + 1*(-1) + 1*(-1) = 0
    expect(scoreOf(s, 'A')).toBe(0);
    expect(s.teams.find((t) => t.id === 'A')?.totalCorrect).toBe(2);
  });

  it('shows a live in-round total before it is committed', () => {
    let s = startRound(setup(), T0, idRng);
    s = mark(s, 'correct', T0, idRng);
    s = mark(s, 'correct', T0, idRng);
    expect(liveTeamScore(s, 'A')).toBe(2);
    expect(scoreOf(s, 'A')).toBe(0); // not committed until endRound
    s = endRound(s, T0);
    expect(scoreOf(s, 'A')).toBe(2);
  });

  it('returns the unresolved word to the queue under the hard-stop rule', () => {
    let s = startRound(setup({ pool: ['w1', 'w2', 'w3', 'w4'] }), T0, idRng);
    s = mark(s, 'correct', T0, idRng); // w1 resolved, w2 now on screen
    s = endRound(s, T0); // w2 was unresolved
    expect(s.wordQueue[0]).toBe('w2');
    expect(s.usedWordIds).toEqual(['w1']);
  });

  it('records the seconds used for the round', () => {
    let s = startRound(setup(), T0, idRng); // 60s round, ends at 61000
    s = mark(s, 'correct', T0, idRng);
    s = endRound(s, T0 + 30_000);
    expect(s.rounds[0]?.durationUsedSec).toBe(30);
  });
});

describe('skip limit & foul gating', () => {
  it('blocks skips past the limit', () => {
    let s = startRound(setup({ config: { skipLimit: 1 } }), T0, idRng);
    s = mark(s, 'skip', T0, idRng); // allowed
    expect(remainingSkips(s)).toBe(0);
    const blocked = mark(s, 'skip', T0, idRng); // ignored
    expect(blocked.currentRound?.marks.length).toBe(1);
    expect(blocked.currentRound?.currentWordId).toBe('w2');
  });

  it('ignores foul when foul is disabled', () => {
    const s = setup({ config: { foulScore: undefined } });
    expect(canFoul(s)).toBe(false);
    const played = mark(startRound(s, T0, idRng), 'foul', T0, idRng);
    expect(played.currentRound?.marks.length).toBe(0);
    expect(played.currentRound?.currentWordId).toBe('w1');
  });
});

describe('undo', () => {
  it('reverts the last mark and restores the word', () => {
    let s = startRound(setup(), T0, idRng);
    s = mark(s, 'correct', T0, idRng); // w1 correct, w2 on screen
    s = undoLast(s);
    expect(s.currentRound?.marks).toEqual([]);
    expect(s.currentRound?.currentWordId).toBe('w1');
    expect(s.usedWordIds).toEqual([]);
    // and play can continue cleanly
    s = mark(s, 'correct', T0, idRng);
    expect(s.currentRound?.currentWordId).toBe('w2');
  });

  it('is a no-op with no marks yet', () => {
    const s = startRound(setup(), T0, idRng);
    expect(undoLast(s)).toBe(s);
  });
});

describe('Time Score mode', () => {
  it('plays a full game and declares the higher scorer the winner', () => {
    let s = setup({ config: { roundCount: 1 } });
    s = playRound(s, ['correct', 'correct']); // A: 2
    s = continueAfterResult(s, T0); // → B intro
    s = playRound(s, ['correct']); // B: 1
    s = continueAfterResult(s, T0); // game over

    expect(isFinished(s)).toBe(true);
    expect(s.winnerTeamIds).toEqual(['A']);
    expect(scoreOf(s, 'A')).toBe(2);
    expect(scoreOf(s, 'B')).toBe(1);
    expect(rankedTeams(s).map((t) => t.id)).toEqual(['A', 'B']);
  });
});

describe('Max Score mode', () => {
  it('finishes the rotation before declaring a winner by default', () => {
    let s = setup({ config: { mode: 'max', maxScore: 3, finishRotationOnMax: true } });
    s = playRound(s, ['correct', 'correct', 'correct']); // A reaches 3
    s = continueAfterResult(s, T0); // not over — B still gets its turn
    expect(isFinished(s)).toBe(false);
    expect(s.currentTeamIndex).toBe(1);

    s = playRound(s, ['correct']); // B: 1
    s = continueAfterResult(s, T0);
    expect(isFinished(s)).toBe(true);
    expect(s.winnerTeamIds).toEqual(['A']);
    expect(s.teams.find((t) => t.id === 'B')?.roundsPlayed).toBe(1);
  });

  it('ends immediately when finishRotationOnMax is off', () => {
    let s = setup({ config: { mode: 'max', maxScore: 3, finishRotationOnMax: false } });
    s = playRound(s, ['correct', 'correct', 'correct']); // A reaches 3
    s = continueAfterResult(s, T0);
    expect(isFinished(s)).toBe(true);
    expect(s.winnerTeamIds).toEqual(['A']);
    expect(s.teams.find((t) => t.id === 'B')?.roundsPlayed).toBe(0); // B never played
  });
});

describe('sudden-death tie-break', () => {
  function tied(): GameSession {
    let s = setup({ config: { roundCount: 1 } });
    s = playRound(s, ['correct']); // A: 1
    s = continueAfterResult(s, T0);
    s = playRound(s, ['correct']); // B: 1
    return continueAfterResult(s, T0); // tie → sudden death
  }

  it('enters sudden death instead of declaring a draw', () => {
    const s = tied();
    expect(isFinished(s)).toBe(false);
    expect(s.status).toBe('intro');
    expect(s.suddenDeath?.contenderIds).toEqual(['A', 'B']);
    expect(s.winnerTeamIds).toEqual([]);
  });

  it('breaks the tie by higher round delta without changing totals', () => {
    let s = tied();
    s = playRound(s, ['correct', 'correct']); // A sudden-death delta 2
    s = continueAfterResult(s, T0); // → B sudden-death round
    s = playRound(s, ['correct']); // B delta 1
    s = continueAfterResult(s, T0);

    expect(isFinished(s)).toBe(true);
    expect(s.winnerTeamIds).toEqual(['A']);
    expect(s.suddenDeath).toBeUndefined();
    expect(scoreOf(s, 'A')).toBe(1); // totals untouched by sudden death
    expect(scoreOf(s, 'B')).toBe(1);
  });

  it('repeats sudden death when the tie-break rounds also tie', () => {
    let s = tied();
    s = playRound(s, ['correct']); // A delta 1
    s = continueAfterResult(s, T0);
    s = playRound(s, ['correct']); // B delta 1
    s = continueAfterResult(s, T0); // still tied → repeat

    expect(isFinished(s)).toBe(false);
    expect(s.status).toBe('intro');
    expect(s.suddenDeath?.contenderIds).toEqual(['A', 'B']);
  });
});

describe('transition guards & reducer', () => {
  it('throws on out-of-phase transitions', () => {
    expect(() => mark(setup(), 'correct', T0, idRng)).toThrow(GameError);
    expect(() => continueAfterResult(setup(), T0)).toThrow(GameError);
    const playing = startRound(setup(), T0, idRng);
    expect(() => startRound(playing, T0, idRng)).toThrow(GameError);
  });

  it('gameReducer dispatches to the matching transition', () => {
    const s = setup();
    expect(gameReducer(s, { type: 'startRound', now: T0, rng: idRng })).toEqual(
      startRound(s, T0, idRng),
    );
  });
});
