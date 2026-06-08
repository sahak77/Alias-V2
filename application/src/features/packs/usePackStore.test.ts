import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Pack } from '@alias/contracts';
import { STARTER_EN } from './data/starter.en';
import {
  PACK_STORE_SCHEMA_VERSION,
  libraryPacks,
  resolveSelectedPacks,
  usePackStore,
} from './usePackStore';

const STORAGE_KEY = 'alias.packs.v1';

const mk = (id: string, words: string[], locale = 'es'): Pack => ({
  id,
  title: id,
  locale,
  schemaVersion: 1,
  cards: words.map((w) => ({ w })),
});

/** Flush the fire-and-forget AsyncStorage write scheduled by a store mutation. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  await AsyncStorage.clear();
  usePackStore.setState({ customPacks: [], selectedPackIds: [], isHydrated: false });
});

describe('libraryPacks / resolveSelectedPacks (pure)', () => {
  it('always lists the bundled starter first', () => {
    expect(libraryPacks([])).toEqual([STARTER_EN]);
    const custom = mk('c1', ['casa']);
    expect(libraryPacks([custom])).toEqual([STARTER_EN, custom]);
  });

  it('falls back to the bundled starter when nothing valid is selected', () => {
    expect(resolveSelectedPacks([], [])).toEqual([STARTER_EN]);
    expect(resolveSelectedPacks([], ['nope'])).toEqual([STARTER_EN]); // unknown id ⇒ fallback
  });

  it('resolves selected ids to packs, preserving selection order', () => {
    const a = mk('a', ['uno']);
    const b = mk('b', ['dos']);
    expect(resolveSelectedPacks([a, b], ['b', 'a'])).toEqual([b, a]);
    expect(resolveSelectedPacks([a, b], ['a', 'ghost'])).toEqual([a]); // unknown dropped, no fallback (≥1 valid)
  });
});

describe('usePackStore — CRUD + selection', () => {
  it('upserts a new custom pack into the library', () => {
    const pack = mk('custom.1', ['casa', 'perro']);
    usePackStore.getState().upsertPack(pack);
    expect(usePackStore.getState().customPacks).toEqual([pack]);
    expect(libraryPacks(usePackStore.getState().customPacks)).toEqual([STARTER_EN, pack]);
  });

  it('upserting an existing id replaces it (edit), not appends', () => {
    usePackStore.getState().upsertPack(mk('custom.1', ['casa']));
    usePackStore.getState().upsertPack(mk('custom.1', ['casa', 'gato']));
    const packs = usePackStore.getState().customPacks;
    expect(packs).toHaveLength(1);
    expect(packs[0]?.cards).toHaveLength(2);
  });

  it('removePack deletes it and drops it from the selection', () => {
    usePackStore.getState().upsertPack(mk('custom.1', ['casa']));
    usePackStore.getState().setSelectedPackIds(['custom.1']);
    usePackStore.getState().removePack('custom.1');
    expect(usePackStore.getState().customPacks).toEqual([]);
    expect(usePackStore.getState().selectedPackIds).toEqual([]);
  });

  it('setSelectedPackIds keeps only known ids and de-dupes', () => {
    usePackStore.getState().upsertPack(mk('custom.1', ['casa']));
    usePackStore.getState().setSelectedPackIds(['custom.1', 'custom.1', 'ghost', STARTER_EN.id]);
    expect(usePackStore.getState().selectedPackIds).toEqual(['custom.1', STARTER_EN.id]);
  });

  it('toggleSelected adds then removes an id', () => {
    usePackStore.getState().upsertPack(mk('custom.1', ['casa']));
    usePackStore.getState().toggleSelected('custom.1');
    expect(usePackStore.getState().selectedPackIds).toContain('custom.1');
    usePackStore.getState().toggleSelected('custom.1');
    expect(usePackStore.getState().selectedPackIds).not.toContain('custom.1');
  });
});

describe('usePackStore — persistence', () => {
  it('writes a versioned payload and restores it on hydrate', async () => {
    const pack = mk('custom.1', ['casa', 'perro']);
    usePackStore.getState().upsertPack(pack);
    usePackStore.getState().setSelectedPackIds(['custom.1']);
    await flush();

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({
      schemaVersion: PACK_STORE_SCHEMA_VERSION,
      customPacks: [pack],
      selectedPackIds: ['custom.1'],
    });

    // Simulate a fresh launch: wipe in-memory state, then hydrate from storage.
    usePackStore.setState({ customPacks: [], selectedPackIds: [], isHydrated: false });
    await usePackStore.getState().hydrate();
    expect(usePackStore.getState().customPacks).toEqual([pack]);
    expect(usePackStore.getState().selectedPackIds).toEqual(['custom.1']);
    expect(usePackStore.getState().isHydrated).toBe(true);
  });

  it('drops malformed persisted packs and stale selected ids on hydrate', async () => {
    const good = mk('good', ['casa']);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: PACK_STORE_SCHEMA_VERSION,
        customPacks: [good, { id: 'bad', title: 'x' /* missing locale/cards */ }],
        selectedPackIds: ['good', 'bad', 'ghost'],
      }),
    );
    await usePackStore.getState().hydrate();
    expect(usePackStore.getState().customPacks).toEqual([good]); // malformed dropped
    expect(usePackStore.getState().selectedPackIds).toEqual(['good']); // stale ids dropped
  });

  it('keeps defaults and still marks hydrated when storage is absent', async () => {
    await usePackStore.getState().hydrate();
    expect(usePackStore.getState().customPacks).toEqual([]);
    expect(usePackStore.getState().isHydrated).toBe(true);
  });
});
