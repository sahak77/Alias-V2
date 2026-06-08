import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETUP_CONFIG, PRESETS } from './setupConfig';
import { useSetupStore } from './useSetupStore';

const get = () => useSetupStore.getState();

const resetState = () =>
  useSetupStore.setState({
    config: DEFAULT_SETUP_CONFIG,
    teams: [
      { id: 't1', name: 'Team 1', color: '#E5484D' },
      { id: 't2', name: 'Team 2', color: '#2E7DF6' },
    ],
    isHydrated: false,
  });

const flush = () => new Promise((r) => setTimeout(r, 20));

beforeEach(async () => {
  await AsyncStorage.clear();
  resetState();
});

describe('useSetupStore', () => {
  it('patchConfig merges a partial config', () => {
    get().patchConfig({ correctScore: 5, foulEnabled: false });
    expect(get().config.correctScore).toBe(5);
    expect(get().config.foulEnabled).toBe(false);
  });

  it('applyPreset applies the preset patch', () => {
    get().applyPreset('hardcore');
    expect(get().config.skipScore).toBe(PRESETS.hardcore.patch.skipScore);
    expect(get().config.skipLimitEnabled).toBe(true);
  });

  it('adds, renames, recolors, and removes teams', () => {
    get().addTeam('#16A34A');
    expect(get().teams).toHaveLength(3);
    const id = get().teams[2]!.id;
    get().renameTeam(id, 'Greens');
    get().setTeamColor(id, '#000000');
    expect(get().teams[2]!.name).toBe('Greens');
    expect(get().teams[2]!.color).toBe('#000000');
    get().removeTeam(id);
    expect(get().teams).toHaveLength(2);
  });

  it('persists choices and rehydrates them as next-game defaults', async () => {
    get().patchConfig({ mode: 'max', maxScore: 77, correctScore: 9 });
    get().addTeam('#16A34A');
    await flush(); // let the fire-and-forget write land

    // wipe in-memory state, then hydrate from storage
    resetState();
    await get().hydrate();

    expect(get().isHydrated).toBe(true);
    expect(get().config.maxScore).toBe(77);
    expect(get().config.correctScore).toBe(9);
    expect(get().teams).toHaveLength(3);
  });
});
