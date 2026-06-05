import { drawNext, shuffle, type Rng } from './wordDraw';

/** Deterministic LCG for repeatable shuffle assertions. */
function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** rng just under 1 ⇒ Fisher–Yates leaves order unchanged (identity shuffle). */
const identityRng: Rng = () => 1 - Number.EPSILON;

describe('shuffle', () => {
  it('returns a permutation containing exactly the same items', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const out = shuffle(input, makeRng(42));
    expect([...out].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c'];
    shuffle(input, makeRng(7));
    expect(input).toEqual(['a', 'b', 'c']);
  });

  it('is deterministic for a given rng seed', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(shuffle(input, makeRng(99))).toEqual(shuffle(input, makeRng(99)));
  });

  it('preserves order under the identity rng', () => {
    expect(shuffle(['a', 'b', 'c'], identityRng)).toEqual(['a', 'b', 'c']);
  });
});

describe('drawNext', () => {
  it('takes the head of the queue', () => {
    expect(drawNext(['w1', 'w2', 'w3'], [], null, identityRng)).toEqual({
      wordId: 'w1',
      wordQueue: ['w2', 'w3'],
    });
  });

  it('never repeats while unused words remain', () => {
    let queue = ['w1', 'w2', 'w3'];
    const used: string[] = [];
    const drawn: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = drawNext(queue, used, drawn[drawn.length - 1] ?? null, identityRng);
      expect(res.wordId).not.toBeNull();
      if (res.wordId) {
        drawn.push(res.wordId);
        used.push(res.wordId);
      }
      queue = res.wordQueue;
    }
    expect(new Set(drawn).size).toBe(3); // all distinct
  });

  it('recycles used words (excluding the current) once the queue is empty', () => {
    const res = drawNext([], ['w1', 'w2', 'w3'], 'w3', identityRng);
    // 'w3' is on screen, so it is excluded from the recycled pool.
    expect(res.wordId).toBe('w1');
    expect([...res.wordQueue, res.wordId].sort()).toEqual(['w1', 'w2']);
  });

  it('returns null when there is nothing left to draw', () => {
    expect(drawNext([], ['only'], 'only', identityRng)).toEqual({ wordId: null, wordQueue: [] });
  });
});
