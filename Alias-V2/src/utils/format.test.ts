import { capitalize, truncate } from './format';

describe('capitalize', () => {
  it('uppercases the first character', () => {
    expect(capitalize('ada')).toBe('Ada');
  });

  it('returns empty string unchanged', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('truncate', () => {
  it('leaves short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and appends an ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hell…');
  });
});
