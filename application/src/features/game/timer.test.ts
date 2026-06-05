import {
  isExpired,
  remainingMs,
  remainingSec,
  resumeEndTimestamp,
  roundEndTimestamp,
} from './timer';

describe('roundEndTimestamp', () => {
  it('is now + duration in ms', () => {
    expect(roundEndTimestamp(1_000, 60)).toBe(1_000 + 60_000);
  });
});

describe('remainingMs', () => {
  it('returns the gap until the end', () => {
    expect(remainingMs(61_000, 1_000)).toBe(60_000);
  });

  it('clamps at zero once past the end', () => {
    expect(remainingMs(61_000, 62_000)).toBe(0);
  });
});

describe('remainingSec', () => {
  it('reads "N" at the very start of an N-second round', () => {
    const end = roundEndTimestamp(0, 60);
    expect(remainingSec(end, 0)).toBe(60);
  });

  it('rounds up partial seconds', () => {
    const end = roundEndTimestamp(0, 60);
    expect(remainingSec(end, 59_500)).toBe(1);
  });

  it('is 0 at and after expiry', () => {
    const end = roundEndTimestamp(0, 60);
    expect(remainingSec(end, 60_000)).toBe(0);
    expect(remainingSec(end, 99_000)).toBe(0);
  });
});

describe('isExpired', () => {
  it('is true at and after the end timestamp', () => {
    expect(isExpired(1_000, 999)).toBe(false);
    expect(isExpired(1_000, 1_000)).toBe(true);
    expect(isExpired(1_000, 1_001)).toBe(true);
  });
});

describe('resumeEndTimestamp', () => {
  it('re-anchors from the paused remaining time without drift', () => {
    // 20s were left when paused; resuming at t=5000 ends at 25000.
    expect(resumeEndTimestamp(5_000, 20_000)).toBe(25_000);
  });
});
