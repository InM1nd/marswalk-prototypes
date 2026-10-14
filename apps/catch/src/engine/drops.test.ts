import { describe, expect, it } from 'vitest';
import { CATCH_SLACK, CLASH_S, EDGE, FIELD_W, REACH_SPEED, SAFE_GAP, isBad, planDrop, spawnIntervalMs, type PlannedDrop } from './drops';
import { lunchDemoConfig } from '../config/campaigns/lunchDemo';

// Small seeded PRNG so a failure is reproducible.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t + 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('planDrop', () => {
  it('keeps every good drop reachable and never stacks a bad drop on a good one', () => {
    const tuning = lunchDemoConfig.drop;
    const duration = lunchDemoConfig.round.durationSeconds;
    for (let seed = 1; seed <= 40; seed++) {
      const rand = mulberry32(seed);
      const all: PlannedDrop[] = [];
      for (let now = 0; now < duration; now += spawnIntervalMs(tuning, now / duration) / 1000) {
        all.push(planDrop(tuning, now, now / duration, 420, all.slice(-8), rand));
      }

      const good = all.filter((d) => !isBad(d.kind)).sort((a, b) => a.arrival - b.arrival);
      for (let i = 1; i < good.length; i++) {
        const dt = good[i].arrival - good[i - 1].arrival;
        expect(Math.abs(good[i].x - good[i - 1].x)).toBeLessThanOrEqual(REACH_SPEED * dt + CATCH_SLACK + 0.001);
      }
      for (const g of good) {
        expect(g.x).toBeGreaterThanOrEqual(EDGE);
        expect(g.x).toBeLessThanOrEqual(FIELD_W - EDGE);
        for (const b of all.filter((d) => isBad(d.kind))) {
          if (Math.abs(b.arrival - g.arrival) < CLASH_S) expect(Math.abs(b.x - g.x)).toBeGreaterThanOrEqual(SAFE_GAP);
        }
      }
    }
  });
});
