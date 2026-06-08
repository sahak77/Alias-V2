import { buildWordPool, STARTER_EN } from '@/features/packs';
import { createSession, defaultGameConfig, mark, startRound } from './engine';
import { clearGame, persistGame } from './persistence';
import { useGameSession } from './useGameSession';

const TEAMS = [
  { id: 'A', name: 'Alpha', color: '#f00' },
  { id: 'B', name: 'Bravo', color: '#00f' },
];

const get = () => useGameSession.getState();

beforeEach(() => {
  get().quit();
});

describe('useGameSession', () => {
  it('starts a game at the intro and loads the pool', () => {
    get().startGame(defaultGameConfig({ roundCount: 1 }), TEAMS, [STARTER_EN]);
    expect(get().session?.status).toBe('intro');
    expect(get().cardsById.size).toBe(STARTER_EN.cards.length);
  });

  it('drives a round through the engine', () => {
    get().startGame(defaultGameConfig({ roundCount: 1 }), TEAMS, [STARTER_EN]);
    get().beginRound();
    expect(get().session?.status).toBe('playing');
    get().markWord('correct');
    expect(get().session?.currentRound?.marks).toHaveLength(1);
    get().finishRound();
    expect(get().session?.status).toBe('roundResult');
    get().next();
    expect(get().session?.status).toBe('intro'); // Bravo still to play
  });

  it('restart rebuilds at intro; quit clears the session', () => {
    get().startGame(defaultGameConfig({ roundCount: 1 }), TEAMS, [STARTER_EN]);
    get().beginRound();
    get().restart();
    expect(get().session?.status).toBe('intro');
    get().quit();
    expect(get().session).toBeNull();
  });

  it('pause freezes the round; resume re-anchors it', () => {
    get().startGame(defaultGameConfig({ roundCount: 1 }), TEAMS, [STARTER_EN]);
    get().beginRound();
    const endBefore = get().session!.roundEndTimestamp!;

    get().pause();
    const paused = get().pausedRemainingMs;
    expect(paused).not.toBeNull();
    expect(paused!).toBeGreaterThan(55_000);
    expect(paused!).toBeLessThanOrEqual(60_000);
    // the engine's timestamp is untouched while paused
    expect(get().session!.roundEndTimestamp).toBe(endBefore);
    // pause is idempotent — it never re-captures over a frozen value
    get().pause();
    expect(get().pausedRemainingMs).toBe(paused);

    get().resume();
    expect(get().pausedRemainingMs).toBeNull();
    const endAfter = get().session!.roundEndTimestamp!;
    expect(endAfter).toBeGreaterThan(Date.now());
    expect(endAfter).toBeLessThanOrEqual(Date.now() + 60_000 + 50);
  });

  it('does not pause outside an active round', () => {
    get().startGame(defaultGameConfig({ roundCount: 1 }), TEAMS, [STARTER_EN]);
    get().pause(); // still at intro
    expect(get().pausedRemainingMs).toBeNull();
  });

  it('hydrate restores an interrupted round into the paused state', async () => {
    // Seed storage with a mid-round game, then wipe memory without touching storage.
    await clearGame();
    const config = defaultGameConfig({ roundCount: 1 });
    const pool = buildWordPool([STARTER_EN]);
    let session = createSession({ config, teams: TEAMS, poolWordIds: pool.wordIds, now: Date.now() });
    session = startRound(session, Date.now());
    session = mark(session, 'correct', Date.now());
    await persistGame({ session, config, teams: TEAMS, packs: [STARTER_EN], pausedRemainingMs: null });

    useGameSession.setState({
      session: null,
      cardsById: new Map(),
      config: null,
      teams: [],
      packs: [],
      pausedRemainingMs: null,
      isHydrated: false,
    });

    await get().hydrate();
    expect(get().isHydrated).toBe(true);
    expect(get().session?.status).toBe('playing');
    expect(get().session?.currentRound?.marks).toHaveLength(1);
    expect(get().cardsById.size).toBe(STARTER_EN.cards.length);
    // resume-from-kill re-enters the paused state (spec §13). With no captured
    // remaining (foreground kill), it falls back to the full round length so the
    // round is genuinely resumable rather than a 0s instant forfeit.
    expect(get().pausedRemainingMs).toBe(60_000);
  });

  it('hydrate is a no-op when nothing is persisted but still marks hydrated', async () => {
    await clearGame();
    useGameSession.setState({ session: null, isHydrated: false });
    await get().hydrate();
    expect(get().isHydrated).toBe(true);
    expect(get().session).toBeNull();
  });
});
