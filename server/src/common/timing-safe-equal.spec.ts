import { timingSafeStringEqual } from './timing-safe-equal';

describe('timingSafeStringEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeStringEqual('secret123', 'secret123')).toBe(true);
  });

  it('returns false for different strings of the same length', () => {
    expect(timingSafeStringEqual('secret123', 'secret456')).toBe(false);
  });

  it('returns false for strings of different lengths', () => {
    expect(timingSafeStringEqual('short', 'a-much-longer-string')).toBe(false);
  });

  it('returns false for empty vs non-empty', () => {
    expect(timingSafeStringEqual('', 'x')).toBe(false);
  });
});
