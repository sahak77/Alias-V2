/**
 * The editable Setup-screen configuration and how it maps to the engine's
 * {@link GameConfig}. Kept pure (no React, no storage) so presets and the
 * config-build are unit-testable; the persisted store ({@link useSetupStore})
 * and the Setup screen consume it.
 *
 * `SetupConfig` is a flat, UI-friendly view: foul and skip-limit are modelled as
 * an enabled-flag plus a value (the engine instead omits the field to disable),
 * and both `roundCount` and `maxScore` are always held so toggling mode keeps
 * each side's last value.
 */

import { defaultGameConfig } from './engine';
import type { BuzzerRule, DescribeMode, GameConfig, GameMode } from './types';

export interface SetupConfig {
  mode: GameMode;
  roundDurationSec: number;
  /** Rounds per team (Time mode). */
  roundCount: number;
  /** Target score (Max mode). */
  maxScore: number;
  /** Points per correct word (1–10). */
  correctScore: number;
  /** Points per skip (−5–0). */
  skipScore: number;
  /** Whether fouls are scored at all (engine omits `foulScore` when off). */
  foulEnabled: boolean;
  /** Points per foul when enabled (−5–0). */
  foulScore: number;
  /** Whether a per-round skip cap applies (engine omits `skipLimit` when off). */
  skipLimitEnabled: boolean;
  /** Max skips per round when enabled. */
  skipLimit: number;
  buzzerRule: BuzzerRule;
  describeMode: DescribeMode;
  /** Max mode: finish the team rotation before declaring a winner (fairness). */
  finishRotationOnMax: boolean;
}

export const SETUP_SCHEMA_VERSION = 1;

export const DEFAULT_SETUP_CONFIG: SetupConfig = {
  mode: 'time',
  roundDurationSec: 60,
  roundCount: 3,
  maxScore: 30,
  correctScore: 1,
  skipScore: 0,
  foulEnabled: true,
  foulScore: -1,
  skipLimitEnabled: false,
  skipLimit: 3,
  buzzerRule: 'hardStop',
  describeMode: 'describe',
  finishRotationOnMax: true,
};

/** Scoring/timer bounds — kept in sync with the engine's `validateSetup`. */
export const SETUP_BOUNDS = {
  roundDurationSec: { min: 15, max: 300, step: 15 },
  roundCount: { min: 1, max: 20, step: 1 },
  maxScore: { min: 10, max: 200, step: 10 },
  correctScore: { min: 1, max: 10, step: 1 },
  skipScore: { min: -5, max: 0, step: 1 },
  foulScore: { min: -5, max: 0, step: 1 },
  skipLimit: { min: 1, max: 10, step: 1 },
} as const;

export type PresetKey = 'family' | 'party' | 'hardcore';

/**
 * One-tap scoring/feel bundles (spec §6.1). Tunable — they only patch the
 * scoring/timer/rule fields, never the teams or the chosen mode.
 */
export const PRESETS: Record<PresetKey, { label: string; patch: Partial<SetupConfig> }> = {
  family: {
    label: 'Family',
    patch: { roundDurationSec: 90, correctScore: 1, skipScore: 0, foulEnabled: false, skipLimitEnabled: false, buzzerRule: 'hardStop' },
  },
  party: {
    label: 'Party',
    patch: { roundDurationSec: 60, correctScore: 1, skipScore: 0, foulEnabled: true, foulScore: -1, skipLimitEnabled: false, buzzerRule: 'hardStop' },
  },
  hardcore: {
    label: 'Hardcore',
    patch: { roundDurationSec: 45, correctScore: 1, skipScore: -1, foulEnabled: true, foulScore: -2, skipLimitEnabled: true, skipLimit: 3, buzzerRule: 'finishWord' },
  },
};

export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

/** Map the flat editable setup into a full {@link GameConfig} for the engine. */
export function buildGameConfig(s: SetupConfig): GameConfig {
  return defaultGameConfig({
    mode: s.mode,
    roundDurationSec: s.roundDurationSec,
    correctScore: s.correctScore,
    skipScore: s.skipScore,
    foulScore: s.foulEnabled ? s.foulScore : undefined,
    skipLimit: s.skipLimitEnabled ? s.skipLimit : undefined,
    buzzerRule: s.buzzerRule,
    describeMode: s.describeMode,
    finishRotationOnMax: s.finishRotationOnMax,
    ...(s.mode === 'time' ? { roundCount: s.roundCount } : { maxScore: s.maxScore }),
  });
}

/** Whether `value` exactly matches a preset's patch over the current config. */
export function activePreset(s: SetupConfig): PresetKey | null {
  for (const key of PRESET_KEYS) {
    const patch = PRESETS[key].patch;
    if ((Object.keys(patch) as (keyof SetupConfig)[]).every((k) => s[k] === patch[k])) return key;
  }
  return null;
}
