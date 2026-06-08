/**
 * The on-device pack LIBRARY (spec §5/§12) — the user's collection of word packs
 * plus which ones are selected for the next game. The bundled {@link STARTER_EN} is
 * always available (the offline seed); user-created packs (`source: 'custom'`, made
 * in the Pack Editor) are persisted here. Downloaded/imported collections layer on
 * later (§2.2 / §2.3).
 *
 * Persisted offline-safe, mirroring the prefs/theme stores' manual pattern: mutations
 * write fire-and-forget to AsyncStorage and {@link hydrate} restores them at launch,
 * re-validating each pack against the shared wire contract (corrupt/old packs are
 * dropped, never crash). Words always belong to a pack; a pack's `locale` is the
 * authoritative word language for all its cards.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pack } from '@alias/contracts';
import { create } from 'zustand';
import { STARTER_EN } from './data/starter.en';

export const PACK_STORE_SCHEMA_VERSION = 1;

const STORAGE_KEY = 'alias.packs.v1';

interface PackState {
  /** User-created packs (`source: 'custom'`). The bundled starter is separate + always present. */
  customPacks: Pack[];
  /** Ids of the packs selected for the next game (a subset of the library). */
  selectedPackIds: string[];
  /** True once persisted packs have been read (or the read failed). */
  isHydrated: boolean;

  /** Add a new custom pack or replace an existing one with the same id (editor save). */
  upsertPack: (pack: Pack) => void;
  removePack: (id: string) => void;
  setSelectedPackIds: (ids: readonly string[]) => void;
  toggleSelected: (id: string) => void;
  hydrate: () => Promise<void>;
}

interface PersistedPacks {
  schemaVersion: number;
  customPacks: Pack[];
  selectedPackIds: string[];
}

/** The full library, bundled starter first, then the user's custom packs. */
export function libraryPacks(customPacks: readonly Pack[]): Pack[] {
  return [STARTER_EN, ...customPacks];
}

/**
 * Resolve the packs chosen for a game from the selected ids. Falls back to the bundled
 * starter when nothing valid is selected, so a game ALWAYS has a playable pool — the
 * offline-first release gate (the backend / a pack download can never gate a word draw).
 */
export function resolveSelectedPacks(customPacks: readonly Pack[], selectedPackIds: readonly string[]): Pack[] {
  const byId = new Map(libraryPacks(customPacks).map((p) => [p.id, p]));
  const chosen = selectedPackIds.map((id) => byId.get(id)).filter((p): p is Pack => p !== undefined);
  return chosen.length > 0 ? chosen : [STARTER_EN];
}

function persist(state: Pick<PackState, 'customPacks' | 'selectedPackIds'>): void {
  const payload: PersistedPacks = { schemaVersion: PACK_STORE_SCHEMA_VERSION, ...state };
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
}

export const usePackStore = create<PackState>((set, get) => {
  const save = () => {
    const { customPacks, selectedPackIds } = get();
    persist({ customPacks, selectedPackIds });
  };

  return {
    customPacks: [],
    selectedPackIds: [],
    isHydrated: false,

    upsertPack: (pack) => {
      const existing = get().customPacks;
      const has = existing.some((p) => p.id === pack.id);
      set({
        customPacks: has ? existing.map((p) => (p.id === pack.id ? pack : p)) : [...existing, pack],
      });
      save();
    },

    removePack: (id) => {
      set({
        customPacks: get().customPacks.filter((p) => p.id !== id),
        selectedPackIds: get().selectedPackIds.filter((sid) => sid !== id),
      });
      save();
    },

    setSelectedPackIds: (ids) => {
      const known = new Set(libraryPacks(get().customPacks).map((p) => p.id));
      set({ selectedPackIds: [...new Set(ids)].filter((id) => known.has(id)) });
      save();
    },

    toggleSelected: (id) => {
      const current = get().selectedPackIds;
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      get().setSelectedPackIds(next);
    },

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const p = JSON.parse(raw) as Partial<PersistedPacks>;
          // Re-validate each persisted pack against the wire contract; drop anything malformed.
          const customPacks = Array.isArray(p.customPacks)
            ? p.customPacks.flatMap((c) => {
                const parsed = Pack.safeParse(c);
                return parsed.success ? [parsed.data] : [];
              })
            : get().customPacks;
          const known = new Set(libraryPacks(customPacks).map((pk) => pk.id));
          const selectedPackIds = Array.isArray(p.selectedPackIds)
            ? p.selectedPackIds.filter((id): id is string => typeof id === 'string' && known.has(id))
            : get().selectedPackIds;
          set({ customPacks, selectedPackIds });
        }
      } catch {
        // Corrupt/absent — keep the defaults.
      } finally {
        set({ isHydrated: true });
      }
    },
  };
});
