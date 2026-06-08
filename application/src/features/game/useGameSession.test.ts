import { defaultGameConfig } from './engine';
import { useGameSession } from './useGameSession';
import { STARTER_EN } from '@/features/packs';

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
});
