import type { Pack } from '@alias/contracts';
import { buildWordPool, cardId, normalizeWord, toGameCards } from './pool';

const packA: Pack = {
  id: 'a',
  title: 'A',
  locale: 'en',
  schemaVersion: 1,
  cards: [{ w: 'cat' }, { w: 'dog' }],
};
const packB: Pack = {
  id: 'b',
  title: 'B',
  locale: 'en',
  schemaVersion: 1,
  cards: [{ w: 'Dog' }, { w: 'fish' }],
};

describe('cardId & normalizeWord', () => {
  it('builds a stable id from pack id + index', () => {
    expect(cardId('a', 0)).toBe('a:0');
  });

  it('folds case and surrounding whitespace', () => {
    expect(normalizeWord('  Dog ')).toBe('dog');
  });
});

describe('toGameCards', () => {
  it('maps wire cards to local cards with stable ids', () => {
    expect(toGameCards(packA)).toEqual([
      { id: 'a:0', packId: 'a', locale: 'en', word: 'cat' },
      { id: 'a:1', packId: 'a', locale: 'en', word: 'dog' },
    ]);
  });

  it('carries taboo and hint only when present', () => {
    const pack: Pack = {
      id: 'p',
      title: 'P',
      locale: 'en',
      schemaVersion: 1,
      cards: [{ w: 'sun', t: ['star', 'hot'], h: 'sky' }],
    };
    expect(toGameCards(pack)[0]).toEqual({
      id: 'p:0',
      packId: 'p',
      locale: 'en',
      word: 'sun',
      taboo: ['star', 'hot'],
      hint: 'sky',
    });
  });
});

describe('buildWordPool', () => {
  it('produces ordered ids and a lookup for a single pack', () => {
    const pool = buildWordPool([packA]);
    expect(pool.wordIds).toEqual(['a:0', 'a:1']);
    expect(pool.cardsById.get('a:0')?.word).toBe('cat');
    expect(pool.cards).toHaveLength(2);
  });

  it('dedupes identical words across packs (first occurrence wins)', () => {
    const pool = buildWordPool([packA, packB]);
    expect(pool.cards.map((c) => c.word)).toEqual(['cat', 'dog', 'fish']);
    expect(pool.wordIds).toEqual(['a:0', 'a:1', 'b:1']);
  });

  it('keeps same-spelling words from different locales separate', () => {
    const en: Pack = { id: 'en', title: 'EN', locale: 'en', schemaVersion: 1, cards: [{ w: 'sol' }] };
    const es: Pack = { id: 'es', title: 'ES', locale: 'es', schemaVersion: 1, cards: [{ w: 'sol' }] };
    expect(buildWordPool([en, es]).cards).toHaveLength(2);
  });
});
