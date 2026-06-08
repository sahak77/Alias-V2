import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { STARTER_EN } from '@/features/packs';
import { defaultGameConfig, type TeamSetup } from './engine';
import { useGameLifecycle } from './useGameLifecycle';
import { useGameSession } from './useGameSession';

const TEAMS: TeamSetup[] = [
  { id: 'A', name: 'Alpha', color: '#f00' },
  { id: 'B', name: 'Bravo', color: '#00f' },
];

describe('useGameLifecycle', () => {
  let handler: ((state: AppStateStatus) => void) | undefined;
  let remove: jest.Mock;

  beforeEach(() => {
    useGameSession.getState().quit();
    handler = undefined;
    remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      handler = listener as (state: AppStateStatus) => void;
      return { remove };
    });
  });

  afterEach(() => jest.restoreAllMocks());

  function startActiveRound() {
    useGameSession.getState().startGame(defaultGameConfig({ roundCount: 1 }), TEAMS, [STARTER_EN]);
    useGameSession.getState().beginRound();
  }

  it('pauses the active round when the app leaves the foreground', () => {
    startActiveRound();
    renderHook(() => useGameLifecycle());
    expect(handler).toBeDefined();

    handler!('background');
    expect(useGameSession.getState().pausedRemainingMs).not.toBeNull();
  });

  it('never auto-resumes on return to the foreground', () => {
    startActiveRound();
    renderHook(() => useGameLifecycle());

    handler!('background');
    const paused = useGameSession.getState().pausedRemainingMs;
    handler!('active');
    expect(useGameSession.getState().pausedRemainingMs).toBe(paused);
  });

  it('removes the AppState listener on unmount', () => {
    const { unmount } = renderHook(() => useGameLifecycle());
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
