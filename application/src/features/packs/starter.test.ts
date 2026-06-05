import { Pack } from '@alias/contracts';
import { buildWordPool } from './pool';
import { STARTER_EN } from './data/starter.en';

describe('bundled starter pack', () => {
  it('validates against the @alias/contracts Pack schema', () => {
    expect(() => Pack.parse(STARTER_EN)).not.toThrow();
  });

  it('is English with enough words to play a full game', () => {
    expect(STARTER_EN.locale).toBe('en');
    expect(STARTER_EN.cards.length).toBeGreaterThanOrEqual(40);
  });

  it('contains no duplicate words', () => {
    const words = STARTER_EN.cards.map((c) => c.w.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
  });

  it('builds a pool with one unique id per card', () => {
    const pool = buildWordPool([STARTER_EN]);
    expect(pool.wordIds).toHaveLength(STARTER_EN.cards.length);
    expect(new Set(pool.wordIds).size).toBe(STARTER_EN.cards.length);
  });
});
