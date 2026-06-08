import i18n from './index';

describe('i18n foundation', () => {
  it('is initialized in English', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe('en');
  });

  it('resolves nested keys', () => {
    expect(i18n.t('common.appName')).toBe('Alias');
    expect(i18n.t('home.play')).toBe('Play');
    expect(i18n.t('game.correct')).toBe('Correct');
  });

  it('interpolates values', () => {
    expect(i18n.t('common.points', { count: 5 })).toBe('5 pts');
    expect(i18n.t('winner.wins', { name: 'Red' })).toBe('Red wins!');
    expect(i18n.t('game.roundProgress', { current: 2, total: 3 })).toBe('Round 2 of 3');
  });

  it('returns the key for an unknown string (no crash)', () => {
    expect(i18n.t('nope.missing')).toBe('nope.missing');
  });
});
