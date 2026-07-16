import type { PrizeSlot } from '../config/schema';

export function resolvePrize(
  segments: PrizeSlot[],
  rng: () => number = Math.random,
): { segment: PrizeSlot; index: number } {
  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
  let roll = rng() * totalWeight;
  for (let i = 0; i < segments.length; i++) {
    roll -= segments[i].weight;
    if (roll <= 0) return { segment: segments[i], index: i };
  }
  const lastIndex = segments.length - 1;
  return { segment: segments[lastIndex], index: lastIndex }; // rounding-error fallback
}
