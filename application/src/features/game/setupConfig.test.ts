import { activePreset, buildGameConfig, DEFAULT_SETUP_CONFIG, PRESETS, type SetupConfig } from './setupConfig';

describe('buildGameConfig', () => {
  it('includes foulScore only when fouls are enabled', () => {
    expect(buildGameConfig({ ...DEFAULT_SETUP_CONFIG, foulEnabled: true, foulScore: -2 }).foulScore).toBe(-2);
    expect(buildGameConfig({ ...DEFAULT_SETUP_CONFIG, foulEnabled: false }).foulScore).toBeUndefined();
  });

  it('includes skipLimit only when the cap is enabled', () => {
    expect(buildGameConfig({ ...DEFAULT_SETUP_CONFIG, skipLimitEnabled: true, skipLimit: 4 }).skipLimit).toBe(4);
    expect(buildGameConfig({ ...DEFAULT_SETUP_CONFIG, skipLimitEnabled: false }).skipLimit).toBeUndefined();
  });

  it('sets roundCount in time mode and maxScore in max mode', () => {
    const time = buildGameConfig({ ...DEFAULT_SETUP_CONFIG, mode: 'time', roundCount: 5 });
    expect(time.mode).toBe('time');
    expect(time.roundCount).toBe(5);

    const max = buildGameConfig({ ...DEFAULT_SETUP_CONFIG, mode: 'max', maxScore: 50 });
    expect(max.mode).toBe('max');
    expect(max.maxScore).toBe(50);
  });

  it('carries through buzzer rule and describe mode', () => {
    const c = buildGameConfig({ ...DEFAULT_SETUP_CONFIG, buzzerRule: 'finishWord', describeMode: 'taboo' });
    expect(c.buzzerRule).toBe('finishWord');
    expect(c.describeMode).toBe('taboo');
  });
});

describe('presets', () => {
  it('a config built from a preset patch is detected as that preset', () => {
    const hardcore = { ...DEFAULT_SETUP_CONFIG, ...PRESETS.hardcore.patch } as SetupConfig;
    expect(activePreset(hardcore)).toBe('hardcore');
  });

  it('returns null once a scored field diverges from every preset', () => {
    expect(activePreset({ ...DEFAULT_SETUP_CONFIG, correctScore: 7 })).toBeNull();
  });

  it('the default config matches the Party preset', () => {
    expect(activePreset(DEFAULT_SETUP_CONFIG)).toBe('party');
  });
});
