import { describe, expect, it } from 'vitest';
import { pickPattern, patternGapMs } from './spawnPatterns';

describe('pickPattern', () => {
  it('always returns at least one spawn', () => {
    for (let i = 0; i < 20; i++) {
      const pattern = pickPattern(() => i / 20);
      expect(pattern.length).toBeGreaterThan(0);
    }
  });

  it('emits twin cones for mid rolls', () => {
    const pattern = pickPattern(() => 0.3);
    expect(pattern.filter((p) => p.kind === 'obstacle')).toHaveLength(2);
    expect(pattern.every((p) => p.obstacleKind === 'cone' || p.kind === 'coin')).toBe(true);
  });

  it('emits barrier for higher rolls', () => {
    const pattern = pickPattern(() => 0.65);
    expect(pattern.some((p) => p.obstacleKind === 'barrier')).toBe(true);
  });
});

describe('patternGapMs', () => {
  it('stays in a readable breathing range', () => {
    expect(patternGapMs(() => 0)).toBe(700);
    expect(patternGapMs(() => 1)).toBe(1600);
  });
});
