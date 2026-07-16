import { describe, expect, it } from 'vitest';
import { resolvePrize } from './prizeResolver';
import type { PrizeSlot } from '../config/schema';

function segment(id: string, weight: number): PrizeSlot {
  return { id, label: id, color: '#000', textColor: '#fff', weight, prize: { code: id, description: id, isWin: true } };
}

describe('resolvePrize', () => {
  it('distributes outcomes proportionally to weight over many trials', () => {
    const segments = [segment('a', 10), segment('b', 30), segment('c', 60)];
    const counts = { a: 0, b: 0, c: 0 };
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      const { segment: s } = resolvePrize(segments, Math.random);
      counts[s.id as keyof typeof counts]++;
    }
    expect(counts.a / trials).toBeCloseTo(0.1, 1);
    expect(counts.b / trials).toBeCloseTo(0.3, 1);
    expect(counts.c / trials).toBeCloseTo(0.6, 1);
  });

  it('always returns the only non-zero-weight segment', () => {
    const segments = [segment('a', 100), segment('b', 0), segment('c', 0)];
    for (let i = 0; i < 50; i++) {
      const { segment: s } = resolvePrize(segments, Math.random);
      expect(s.id).toBe('a');
    }
  });

  it('is deterministic given a fixed rng', () => {
    const segments = [segment('a', 50), segment('b', 50)];
    const { index } = resolvePrize(segments, () => 0);
    expect(index).toBe(0);
    const { index: index2 } = resolvePrize(segments, () => 0.999999);
    expect(index2).toBe(1);
  });
});
