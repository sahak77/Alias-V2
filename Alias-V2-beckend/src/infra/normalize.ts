/**
 * Shared text normalizer — the ONE infra file the RN app also imports, so it MUST
 * stay dependency-free / RN-safe (no Node built-ins, no infra; enforced by lint).
 * Device + server must use this identical logic so the on-device content gate and
 * the publish gate agree and `contentHash` never drifts.
 */

/** Max length for an untrusted free-text theme (matches GenerationRequest cap). */
export const MAX_THEME_LENGTH = 200;

type CodeRange = readonly [start: number, end: number];

// Build a global regex char-class from code-point ranges. Constructed (not a
// literal) so no invisible characters live in source and ESLint's no-control-regex
// has nothing static to flag.
function classFromRanges(ranges: readonly CodeRange[]): RegExp {
  const hex = (n: number): string => `\\u${n.toString(16).padStart(4, '0')}`;
  const body = ranges
    .map(([start, end]) => (start === end ? hex(start) : `${hex(start)}-${hex(end)}`))
    .join('');
  return new RegExp(`[${body}]`, 'g');
}

// Zero-width characters + BOM (U+200B–U+200D, U+FEFF).
const ZERO_WIDTH = classFromRanges([
  [0x200b, 0x200d],
  [0xfeff, 0xfeff],
]);
// Bidirectional control characters (U+202A–U+202E, U+2066–U+2069).
const BIDI_CONTROL = classFromRanges([
  [0x202a, 0x202e],
  [0x2066, 0x2069],
]);
// C0/C1 control chars except tab (U+0009), LF (U+000A), CR (U+000D).
const CONTROL_CHARS = classFromRanges([
  [0x0000, 0x0008],
  [0x000b, 0x000c],
  [0x000e, 0x001f],
  [0x007f, 0x009f],
]);

// Guard NFKC for engines that may lack String.prototype.normalize.
function nfkc(input: string): string {
  return typeof input.normalize === 'function' ? input.normalize('NFKC') : input;
}

/** Strip zero-width/bidi/control chars, NFKC-normalize, collapse whitespace, trim. */
export function normalizeText(input: string): string {
  return nfkc(input)
    .replace(ZERO_WIDTH, '')
    .replace(BIDI_CONTROL, '')
    .replace(CONTROL_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize + hard length cap for untrusted theme input. */
export function normalizeTheme(input: string): string {
  return normalizeText(input).slice(0, MAX_THEME_LENGTH);
}
