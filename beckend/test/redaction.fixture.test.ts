import { describe, expect, it } from 'vitest';
import { normalizeTheme } from '../src/infra/normalize';

/**
 * BLOCKING redaction gate (the architecture's highest-risk item). The LLM path is
 * stubbed today, so this asserts the redaction SEAM exists and the shared normalizer
 * works. Once generation + OTel are wired, this MUST also assert that `theme`, the
 * install token, and any BYO-key NEVER appear in exported spans/logs.
 */
describe('redaction gate (seam)', () => {
  it('the shared normalizer strips zero-width / bidi / control characters', () => {
    const zeroWidth = String.fromCharCode(0x200b);
    const bidi = String.fromCharCode(0x202e);
    const control = String.fromCharCode(0x0007);
    const dirty = `spa${zeroWidth}ce${bidi}expl${control}oration`;

    expect(normalizeTheme(dirty)).toBe('spaceexploration');
  });

  it.todo('asserts theme/token/BYO-key never appear in exported OTel spans or pino logs');
});
