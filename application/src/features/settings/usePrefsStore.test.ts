import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrefsStore } from './usePrefsStore';

const get = () => usePrefsStore.getState();
const flush = () => new Promise((r) => setTimeout(r, 20));

beforeEach(async () => {
  await AsyncStorage.clear();
  usePrefsStore.setState({ soundEnabled: true, hapticsEnabled: true, handedness: 'right', isHydrated: false });
});

describe('usePrefsStore', () => {
  it('toggles sound, haptics, and handedness', () => {
    get().setSoundEnabled(false);
    get().setHapticsEnabled(false);
    get().setHandedness('left');
    expect(get().soundEnabled).toBe(false);
    expect(get().hapticsEnabled).toBe(false);
    expect(get().handedness).toBe('left');
  });

  it('persists and rehydrates preferences', async () => {
    get().setHapticsEnabled(false);
    get().setHandedness('left');
    await flush();

    usePrefsStore.setState({ soundEnabled: true, hapticsEnabled: true, handedness: 'right', isHydrated: false });
    await get().hydrate();

    expect(get().isHydrated).toBe(true);
    expect(get().hapticsEnabled).toBe(false);
    expect(get().handedness).toBe('left');
  });

  it('marks hydrated even with nothing stored', async () => {
    await get().hydrate();
    expect(get().isHydrated).toBe(true);
  });
});
