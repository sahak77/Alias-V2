/**
 * Theme preference store (Zustand) persisted to AsyncStorage. Persistence is
 * offline-safe and best-effort — a read/write failure silently falls back to
 * defaults and never blocks the UI, consistent with the offline-first invariant.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { THEME_SCHEMA_VERSION, type Appearance, type ThemeKey } from './types';
import { themes } from './registry';

const STORAGE_KEY = 'alias.theme.v1';

interface PersistedPref {
  schemaVersion: number;
  themeKey: ThemeKey;
  appearance: Appearance;
}

interface ThemeState {
  themeKey: ThemeKey;
  appearance: Appearance;
  /** True once the persisted preference has been read (or read failed). */
  isHydrated: boolean;
  setThemeKey: (key: ThemeKey) => void;
  setAppearance: (appearance: Appearance) => void;
  hydrate: () => Promise<void>;
}

function persist(themeKey: ThemeKey, appearance: Appearance): void {
  const pref: PersistedPref = { schemaVersion: THEME_SCHEMA_VERSION, themeKey, appearance };
  // Fire-and-forget; never let a storage error surface to the UI.
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pref)).catch(() => {});
}

function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && value in themes;
}

function isAppearance(value: unknown): value is Appearance {
  return value === 'light' || value === 'dark' || value === 'system';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeKey: 'classic',
  appearance: 'system',
  isHydrated: false,

  setThemeKey: (key) => {
    set({ themeKey: key });
    persist(key, get().appearance);
  },

  setAppearance: (appearance) => {
    set({ appearance });
    persist(get().themeKey, appearance);
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const pref = parsed as Partial<PersistedPref>;
          set({
            themeKey: isThemeKey(pref.themeKey) ? pref.themeKey : get().themeKey,
            appearance: isAppearance(pref.appearance) ? pref.appearance : get().appearance,
          });
        }
      }
    } catch {
      // Corrupt/absent preference — keep defaults.
    } finally {
      set({ isHydrated: true });
    }
  },
}));
