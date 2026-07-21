export type ObstacleKind = 'cone' | 'barrier';

export interface PendingSpawn {
  delayMs: number;
  kind: 'obstacle' | 'coin';
  obstacleKind?: ObstacleKind;
  /** Index into COIN_HEIGHTS when kind === 'coin'. */
  coinHeightIndex?: number;
}

/** Readable encounter patterns instead of pure independent randomness. */
export function pickPattern(rng: () => number = Math.random): PendingSpawn[] {
  const roll = rng();
  if (roll < 0.22) {
    return [{ delayMs: 0, kind: 'obstacle', obstacleKind: 'cone' }];
  }
  if (roll < 0.4) {
    // twin cones — short gap
    return [
      { delayMs: 0, kind: 'obstacle', obstacleKind: 'cone' },
      { delayMs: 200, kind: 'obstacle', obstacleKind: 'cone' },
    ];
  }
  if (roll < 0.58) {
    // coin over cone — risk/reward
    return [
      { delayMs: 0, kind: 'obstacle', obstacleKind: 'cone' },
      { delayMs: 0, kind: 'coin', coinHeightIndex: 1 },
    ];
  }
  if (roll < 0.72) {
    return [{ delayMs: 0, kind: 'obstacle', obstacleKind: 'barrier' }];
  }
  if (roll < 0.85) {
    return [
      { delayMs: 0, kind: 'obstacle', obstacleKind: 'barrier' },
      { delayMs: 40, kind: 'coin', coinHeightIndex: 2 },
    ];
  }
  if (roll < 0.93) {
    return [
      { delayMs: 0, kind: 'coin', coinHeightIndex: 0 },
      { delayMs: 220, kind: 'coin', coinHeightIndex: 2 },
    ];
  }
  // breather
  return [{ delayMs: 350, kind: 'coin', coinHeightIndex: 1 }];
}

export function patternGapMs(rng: () => number = Math.random): number {
  return 700 + rng() * 900;
}
