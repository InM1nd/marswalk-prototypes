import { describe, expect, it } from 'vitest';
import { comboMultiplier } from '../store/gameStore';

describe('comboMultiplier', () => {
  it('ramps every three combo hits', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(3)).toBe(1);
    expect(comboMultiplier(4)).toBe(2);
    expect(comboMultiplier(7)).toBe(3);
  });
});
