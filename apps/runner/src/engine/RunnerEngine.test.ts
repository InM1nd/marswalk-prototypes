import { describe, expect, it } from 'vitest';
import { jumpVelocity } from './RunnerEngine';

describe('jumpVelocity', () => {
  it('allows two jumps, with a slightly shorter second jump', () => {
    expect(jumpVelocity(2, -14)).toBe(-14);
    expect(jumpVelocity(1, -14)).toBeCloseTo(-12.04);
    expect(jumpVelocity(0, -14)).toBeNull();
  });
});
