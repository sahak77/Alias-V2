/**
 * App preferences (sound, haptics, handedness) — the "feel & accessibility"
 * slice of the Settings entity (spec §5/§6.1). Persisted offline-safe, mirroring
 * the theme store's manual pattern: changes write fire-and-forget to AsyncStorage
 * and {@link hydrate} restores them at launch. Theme/appearance live in their own
 * store (`src/theme`); this holds the rest.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type Handedness = 'left' | 'right';

export const PREFS_SCHEMA_VERSION = 1;

const STORAGE_KEY = 'alias.prefs.v1';

interface PrefsState {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  /** Which hand the primary action sits under (mirrors the action bar). */
  handedness: Handedness;
  /** True once persisted prefs have been read (or the read failed). */
  isHydrated: boolean;

  setSoundEnabled: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setHandedness: (value: Handedness) => void;
  hydrate: () => Promise<void>;
}

interface PersistedPrefs {
  schemaVersion: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  handedness: Handedness;
}

function persist(state: Pick<PrefsState, 'soundEnabled' | 'hapticsEnabled' | 'handedness'>): void {
  const payload: PersistedPrefs = { schemaVersion: PREFS_SCHEMA_VERSION, ...state };
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
}

export const usePrefsStore = create<PrefsState>((set, get) => {
  const save = () => {
    const { soundEnabled, hapticsEnabled, handedness } = get();
    persist({ soundEnabled, hapticsEnabled, handedness });
  };

  return {
    soundEnabled: true,
    hapticsEnabled: true,
    handedness: 'right',
    isHydrated: false,

    setSoundEnabled: (soundEnabled) => {
      set({ soundEnabled });
      save();
    },
    setHapticsEnabled: (hapticsEnabled) => {
      set({ hapticsEnabled });
      save();
    },
    setHandedness: (handedness) => {
      set({ handedness });
      save();
    },

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const p = JSON.parse(raw) as Partial<PersistedPrefs>;
          set({
            soundEnabled: typeof p.soundEnabled === 'boolean' ? p.soundEnabled : get().soundEnabled,
            hapticsEnabled: typeof p.hapticsEnabled === 'boolean' ? p.hapticsEnabled : get().hapticsEnabled,
            handedness: p.handedness === 'left' || p.handedness === 'right' ? p.handedness : get().handedness,
          });
        }
      } catch {
        // Corrupt/absent prefs — keep the defaults.
      } finally {
        set({ isHydrated: true });
      }
    },
  };
});
