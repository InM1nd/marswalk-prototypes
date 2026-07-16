import { describe, expect, it, vi } from 'vitest';
import { computeTargetRotation } from './geometry';

describe('computeTargetRotation', () => {
  it('lands within the target segment bounds for every index, 8 segments', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // no jitter
    const total = 8;
    const segmentAngle = 360 / total;
    for (let i = 0; i < total; i++) {
      const rotation = computeTargetRotation(i, total, 4);
      const targetWithinCircle = rotation % 360;
      // rotating the wheel by `targetWithinCircle` must bring segment i's
      // center (i*segmentAngle + segmentAngle/2) exactly under the pointer (0)
      const landedAngle = (segmentAngle * i + segmentAngle / 2 + targetWithinCircle) % 360;
      expect(Math.abs(landedAngle)).toBeLessThan(0.001);
    }
    vi.restoreAllMocks();
  });

  it('includes the requested number of full spins', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const rotation = computeTargetRotation(0, 6, 5);
    expect(rotation).toBeGreaterThanOrEqual(5 * 360);
    expect(rotation).toBeLessThan(6 * 360);
    vi.restoreAllMocks();
  });

  it.each([4, 6, 8, 12])('stays within segment bounds under jitter, %i segments', (total) => {
    const segmentAngle = 360 / total;
    for (let i = 0; i < total; i++) {
      const rotation = computeTargetRotation(i, total, 1);
      const targetWithinCircle = rotation % 360;
      const landedAngle = (segmentAngle * i + segmentAngle / 2 + targetWithinCircle) % 360;
      const distanceFromCenter = Math.min(landedAngle, 360 - landedAngle);
      expect(distanceFromCenter).toBeLessThan(segmentAngle / 2);
    }
  });
});
