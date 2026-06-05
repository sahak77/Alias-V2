import { applyDelta, roundDelta } from './scoring';
import { defaultGameConfig } from './engine';

describe('roundDelta', () => {
  it('uses the spec default scoring (+1 correct, 0 skip, -1 foul)', () => {
    const config = defaultGameConfig();
    expect(roundDelta({ correct: 5, skip: 2, foul: 1 }, config)).toBe(5 - 1);
  });

  it('honors a negative skip score', () => {
    const config = defaultGameConfig({ skipScore: -1 });
    expect(roundDelta({ correct: 3, skip: 2, foul: 0 }, config)).toBe(3 - 2);
  });

  it('treats foul as 0 when foul is disabled (foulScore undefined)', () => {
    const config = defaultGameConfig({ foulScore: undefined });
    expect(roundDelta({ correct: 1, skip: 0, foul: 4 }, config)).toBe(1);
  });

  it('can produce a negative round delta', () => {
    const config = defaultGameConfig({ skipScore: -1, foulScore: -2 });
    expect(roundDelta({ correct: 1, skip: 1, foul: 1 }, config)).toBe(1 - 1 - 2);
  });
});

describe('applyDelta', () => {
  it('allows negative totals by default', () => {
    expect(applyDelta(1, -3, true)).toBe(-2);
  });

  it('clamps to zero when negatives are disallowed', () => {
    expect(applyDelta(1, -3, false)).toBe(0);
  });

  it('adds a positive delta the same way regardless of clamp', () => {
    expect(applyDelta(4, 3, true)).toBe(7);
    expect(applyDelta(4, 3, false)).toBe(7);
  });
});
