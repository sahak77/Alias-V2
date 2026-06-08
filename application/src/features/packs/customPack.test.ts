import { buildCustomPack, newCustomPackId, parseWordList } from './customPack';

describe('parseWordList', () => {
  it('trims, drops blank lines, and splits on newlines and commas', () => {
    expect(parseWordList('apple\n  mountain  \n\nguitar, ocean')).toEqual(['apple', 'mountain', 'guitar', 'ocean']);
  });

  it('de-dupes case-insensitively, keeping the first occurrence', () => {
    expect(parseWordList('Apple\napple\nAPPLE\npear')).toEqual(['Apple', 'pear']);
  });

  it('returns an empty list for blank input', () => {
    expect(parseWordList('   \n  \n')).toEqual([]);
  });
});

describe('buildCustomPack', () => {
  it('builds a wire Pack from a title + locale + word text', () => {
    expect(buildCustomPack({ id: 'custom.1', title: '  Movie night ', locale: 'es', wordsText: 'casa\nperro' })).toEqual({
      id: 'custom.1',
      title: 'Movie night',
      locale: 'es',
      schemaVersion: 1,
      cards: [{ w: 'casa' }, { w: 'perro' }],
    });
  });

  it('returns null when the title is empty', () => {
    expect(buildCustomPack({ id: 'c', title: '   ', locale: 'es', wordsText: 'casa' })).toBeNull();
  });

  it('returns null when there are no words', () => {
    expect(buildCustomPack({ id: 'c', title: 'Mine', locale: 'es', wordsText: '  \n ' })).toBeNull();
  });
});

describe('newCustomPackId', () => {
  it('is deterministic for a given timestamp and prefixed', () => {
    expect(newCustomPackId(0)).toBe('custom.0');
    expect(newCustomPackId(1234567890)).toBe(newCustomPackId(1234567890));
    expect(newCustomPackId(1).startsWith('custom.')).toBe(true);
  });
});
