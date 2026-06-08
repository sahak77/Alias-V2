import AsyncStorage from '@react-native-async-storage/async-storage';
import { STARTER_EN, buildWordPool } from '@/features/packs';
import { createSession, defaultGameConfig, mark, startRound, type TeamSetup } from './engine';
import { loadGame, persistGame } from './persistence';
import type { GameConfig, GameSession } from './types';

const TEAMS: TeamSetup[] = [
  { id: 'A', name: 'Alpha', color: '#f00' },
  { id: 'B', name: 'Bravo', color: '#00f' },
];

/** A mid-round (playing) session with one mark already recorded. */
function playingGame(): { session: GameSession; config: GameConfig } {
  const config = defaultGameConfig({ roundCount: 1 });
  const pool = buildWordPool([STARTER_EN]);
  let session = createSession({ config, teams: TEAMS, poolWordIds: pool.wordIds, now: Date.now() });
  session = startRound(session, Date.now());
  session = mark(session, 'correct', Date.now());
  return { session, config };
}

async function gameKey(): Promise<string> {
  const keys = await AsyncStorage.getAllKeys();
  const key = keys.find((k) => k.includes('game-session'));
  if (!key) throw new Error('no persisted game key');
  return key;
}

describe('game persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('round-trips an in-progress session and rebuilds the pool from packs', async () => {
    const { session, config } = playingGame();
    await persistGame({ session, config, teams: TEAMS, packs: [STARTER_EN], pausedRemainingMs: 12_345 });

    const loaded = await loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.session).toEqual(session);
    expect(loaded!.session.status).toBe('playing');
    expect(loaded!.pausedRemainingMs).toBe(12_345);
    // cardsById is rebuilt (not serialized) and the persisted word ids still resolve.
    expect(loaded!.cardsById.size).toBe(STARTER_EN.cards.length);
    const currentWordId = loaded!.session.currentRound!.currentWordId!;
    expect(loaded!.cardsById.has(currentWordId)).toBe(true);
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadGame()).toBeNull();
  });

  it('does not persist a finished game and clears any saved one', async () => {
    const { session, config } = playingGame();
    await persistGame({ session, config, teams: TEAMS, packs: [STARTER_EN], pausedRemainingMs: null });
    expect(await loadGame()).not.toBeNull();

    await persistGame({
      session: { ...session, status: 'finished' },
      config,
      teams: TEAMS,
      packs: [STARTER_EN],
      pausedRemainingMs: null,
    });
    expect(await loadGame()).toBeNull();
  });

  it('returns null on corrupt stored data', async () => {
    const { session, config } = playingGame();
    await persistGame({ session, config, teams: TEAMS, packs: [STARTER_EN], pausedRemainingMs: null });
    await AsyncStorage.setItem(await gameKey(), '{ not valid json');
    expect(await loadGame()).toBeNull();
  });

  it('returns null for an unmigratable schema version', async () => {
    const { session, config } = playingGame();
    await persistGame({ session, config, teams: TEAMS, packs: [STARTER_EN], pausedRemainingMs: null });
    await AsyncStorage.setItem(
      await gameKey(),
      JSON.stringify({ schemaVersion: 999, session, config, teams: TEAMS, packs: [STARTER_EN], pausedRemainingMs: null }),
    );
    expect(await loadGame()).toBeNull();
  });
});
