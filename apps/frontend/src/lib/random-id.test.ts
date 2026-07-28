import { describe, expect, it } from 'vitest';
import { randomId } from './random-id';

describe('randomId', () => {
  it('returns hex of the requested byte length', () => {
    expect(randomId(8)).toMatch(/^[0-9a-f]{16}$/);
    expect(randomId(16)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('produces distinct values', () => {
    const a = randomId();
    const b = randomId();
    expect(a).not.toBe(b);
  });
});
