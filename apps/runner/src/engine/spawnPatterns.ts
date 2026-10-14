export type ObstacleKind = 'cone' | 'barrier';

export interface PendingSpawn {
  delayMs: number;
  kind: 'obstacle' | 'coin';
  obstacleKind?: ObstacleKind;
  /** Index into COIN_HEIGHTS when kind === 'coin'. */
  coinHeightIndex?: number;
}

/**
 * Readable encounter patterns instead of pure independent randomness.
 * Delays are relative to the previous spawn, in ms of distance at base speed.
 * Coin height indices: 0 = on the road, 1 = single jump, 2-3 = double jump.
 */
export function pickPattern(rng: () => number = Math.random): PendingSpawn[] {
  const coin = (delayMs: number, coinHeightIndex: number): PendingSpawn => ({ delayMs, kind: 'coin', coinHeightIndex });
  const roll = rng();
  if (roll < 0.18) {
    // cone with a coin arc over it — rewards a well-timed hop
    return [coin(0, 1), { delayMs: 180, kind: 'obstacle', obstacleKind: 'cone' }, coin(0, 1), coin(180, 1)];
  }
  if (roll < 0.34) {
    // twin cones — "hop-hop": room to land and jump again
    return [
      { delayMs: 0, kind: 'obstacle', obstacleKind: 'cone' },
      coin(0, 1),
      { delayMs: 780, kind: 'obstacle', obstacleKind: 'cone' },
      coin(0, 1),
    ];
  }
  if (roll < 0.5) {
    // free coin run on the road — builds the combo
    return [coin(0, 0), coin(150, 0), coin(150, 0), coin(150, 0), coin(150, 0)];
  }
  if (roll < 0.66) {
    // barrier with a prize on top for a full double jump
    return [{ delayMs: 0, kind: 'obstacle', obstacleKind: 'barrier' }, coin(40, 3)];
  }
  if (roll < 0.78) {
    return [{ delayMs: 0, kind: 'obstacle', obstacleKind: 'barrier' }];
  }
  if (roll < 0.9) {
    // sky arc — optional double-jump bonus
    return [coin(0, 1), coin(150, 2), coin(150, 3), coin(150, 2), coin(150, 1)];
  }
  return [{ delayMs: 0, kind: 'obstacle', obstacleKind: 'cone' }];
}

export function patternGapMs(rng: () => number = Math.random): number {
  return 700 + rng() * 900;
}
