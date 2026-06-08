import type { ContentPolicy, WordCard } from '@alias/contracts';
import { describe, expect, it } from 'vitest';
import { assertInputAllowed, filterOutput } from './content-gate';

const policy = (blocklist: string[]): ContentPolicy => ({ locale: 'en', version: 1, blocklist });

describe('content-gate.assertInputAllowed', () => {
  it('allows any theme when the policy is null or the blocklist is empty', () => {
    expect(() => assertInputAllowed('anything', null)).not.toThrow();
    expect(() => assertInputAllowed('anything', policy([]))).not.toThrow();
  });

  it('rejects a theme that contains a blocklisted term (CONTENT_REJECTED)', () => {
    expect(() => assertInputAllowed('a forbidden topic', policy(['forbidden']))).toThrow(
      expect.objectContaining({ code: 'CONTENT_REJECTED' }),
    );
  });

  it('matches case-insensitively and through zero-width obfuscation', () => {
    const zeroWidth = String.fromCharCode(0x200b);
    expect(() => assertInputAllowed(`FORB${zeroWidth}IDDEN`, policy(['forbidden']))).toThrow(
      expect.objectContaining({ code: 'CONTENT_REJECTED' }),
    );
  });

  it('never echoes the theme in the rejection message', () => {
    try {
      assertInputAllowed('forbidden secret', policy(['forbidden']));
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as Error).message).not.toContain('secret');
    }
  });
});

describe('content-gate.filterOutput', () => {
  const cards: WordCard[] = [
    { w: 'Apple' },
    { w: 'apple' }, // duplicate
    { w: 'Banana', d: 'a forbidden fruit' }, // blocklisted via description
    { w: '' }, // empty word
    { w: 'Cherry', t: ['forbidden'] }, // blocklisted via taboo term
    { w: 'Date' },
  ];

  it('dedupes by normalized word, drops empties, and drops blocklist hits in any field', () => {
    const out = filterOutput(cards, policy(['forbidden']));
    expect(out.map((c) => c.w)).toEqual(['Apple', 'Date']);
  });

  it('only dedupes + drops empties when the blocklist is empty', () => {
    const out = filterOutput(cards, policy([]));
    expect(out.map((c) => c.w)).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
  });
});
