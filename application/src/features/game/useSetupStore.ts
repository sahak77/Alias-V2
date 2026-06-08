/**
 * Setup-screen state, persisted as the next-game defaults (spec §6.1). Mirrors
 * the theme store's offline-safe manual-persist pattern: changes are written
 * fire-and-forget to AsyncStorage and {@link hydrate} restores them on launch,
 * so the player's last teams + scoring/feel choices pre-fill a new game. Purely
 * local — no network — so the offline-first invariant is unaffected.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { DEFAULT_TEAM_COLORS } from '@/theme';
import { MAX_TEAMS, type TeamSetup } from './engine';
import {
  DEFAULT_SETUP_CONFIG,
  PRESETS,
  SETUP_SCHEMA_VERSION,
  type PresetKey,
  type SetupConfig,
} from './setupConfig';

const STORAGE_KEY = 'alias.setup.v1';

const FALLBACK_COLOR = '#888888';
const defaultTeams = (): TeamSetup[] => [
  { id: 't1', name: 'Team 1', color: DEFAULT_TEAM_COLORS[0] ?? FALLBACK_COLOR },
  { id: 't2', name: 'Team 2', color: DEFAULT_TEAM_COLORS[1] ?? FALLBACK_COLOR },
];

interface PersistedSetup {
  schemaVersion: number;
  config: SetupConfig;
  teams: TeamSetup[];
}

interface SetupStore {
  config: SetupConfig;
  teams: TeamSetup[];
  /** True once persisted defaults have been read (or the read failed). */
  isHydrated: boolean;

  patchConfig: (patch: Partial<SetupConfig>) => void;
  applyPreset: (key: PresetKey) => void;
  addTeam: (color: string) => void;
  removeTeam: (id: string) => void;
  renameTeam: (id: string, name: string) => void;
  setTeamColor: (id: string, color: string) => void;
  hydrate: () => Promise<void>;
}

function persist(config: SetupConfig, teams: TeamSetup[]): void {
  const payload: PersistedSetup = { schemaVersion: SETUP_SCHEMA_VERSION, config, teams };
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
}

function isSetupConfig(value: unknown): value is SetupConfig {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    (c.mode === 'time' || c.mode === 'max') &&
    typeof c.roundDurationSec === 'number' &&
    typeof c.correctScore === 'number' &&
    typeof c.foulEnabled === 'boolean' &&
    typeof c.skipLimitEnabled === 'boolean'
  );
}

function isTeamArray(value: unknown): value is TeamSetup[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      (t) => typeof t === 'object' && t !== null && typeof (t as TeamSetup).id === 'string',
    )
  );
}

export const useSetupStore = create<SetupStore>((set, get) => {
  const save = () => persist(get().config, get().teams);

  return {
    config: DEFAULT_SETUP_CONFIG,
    teams: defaultTeams(),
    isHydrated: false,

    patchConfig: (patch) => {
      set({ config: { ...get().config, ...patch } });
      save();
    },

    applyPreset: (key) => {
      set({ config: { ...get().config, ...PRESETS[key].patch } });
      save();
    },

    addTeam: (color) => {
      const { teams } = get();
      if (teams.length >= MAX_TEAMS) return;
      set({ teams: [...teams, { id: `t${teams.length + 1}-${Date.now()}`, name: `Team ${teams.length + 1}`, color }] });
      save();
    },

    removeTeam: (id) => {
      set({ teams: get().teams.filter((t) => t.id !== id) });
      save();
    },

    renameTeam: (id, name) => {
      set({ teams: get().teams.map((t) => (t.id === id ? { ...t, name } : t)) });
      save();
    },

    setTeamColor: (id, color) => {
      set({ teams: get().teams.map((t) => (t.id === id ? { ...t, color } : t)) });
      save();
    },

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedSetup>;
          if (parsed.schemaVersion === SETUP_SCHEMA_VERSION && isSetupConfig(parsed.config) && isTeamArray(parsed.teams)) {
            set({ config: parsed.config, teams: parsed.teams });
          }
        }
      } catch {
        // Corrupt/absent defaults — keep the built-in ones.
      } finally {
        set({ isHydrated: true });
      }
    },
  };
});
