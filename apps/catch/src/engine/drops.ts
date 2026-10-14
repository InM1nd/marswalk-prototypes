export type DropKind = 'balea' | 'alverde' | 'ebelin' | 'coupon' | 'bomb' | 'box';

export const GOOD_KINDS: DropKind[] = ['balea', 'alverde', 'ebelin'];
export const POINTS: Record<DropKind, number> = {
  balea: 10,
  alverde: 15,
  ebelin: 20,
  coupon: 50,
  bomb: 0,
  box: 0,
};

export interface DropTuning {
  fallSpeed: number;
  fallSpeedEnd: number;
  spawnEveryMs: number;
  spawnEveryEndMs: number;
  badChance: number;
  badChanceEnd: number;
  goldenChance: number;
}

export interface PlannedDrop {
  kind: DropKind;
  x: number;
  speed: number;
  /** Seconds since round start when the drop reaches the bag's mouth. */
  arrival: number;
}

/** Playfield is 360 logical units wide; drops never spawn closer than this to an edge. */
export const FIELD_W = 360;
export const EDGE = 30;
/** Bag speed a player can sustain with a thumb drag (logical units / s). Spawns stay inside it. */
export const REACH_SPEED = 380;
/** A good and a bad drop arriving this close in time must be at least SAFE_GAP apart. */
export const CLASH_S = 0.45;
export const SAFE_GAP = 96;
/** Slack for the bag's own width: it catches anything within ±this of its centre. */
export const CATCH_SLACK = 36;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function isBad(kind: DropKind): boolean {
  return kind === 'bomb' || kind === 'box';
}

export function spawnIntervalMs(t: DropTuning, progress: number): number {
  return lerp(t.spawnEveryMs, t.spawnEveryEndMs, Math.min(1, progress));
}

/**
 * Plans the next drop. Fairness rules (covered by drops.test.ts):
 * - every good drop is reachable from the previous good one at REACH_SPEED;
 * - no good drop lands next to a bad one at nearly the same moment.
 */
export function planDrop(
  tuning: DropTuning,
  now: number,
  progress: number,
  fallDistance: number,
  recent: PlannedDrop[],
  rand: () => number = Math.random,
): PlannedDrop {
  const p = Math.min(1, progress);
  const roll = rand();
  const badChance = lerp(tuning.badChance, tuning.badChanceEnd, p);
  const kind: DropKind =
    roll < badChance
      ? rand() < 0.7
        ? 'bomb'
        : 'box'
      : roll < badChance + tuning.goldenChance
        ? 'coupon'
        : GOOD_KINDS[Math.floor(rand() * GOOD_KINDS.length)];
  // No per-drop speed jitter: drops then arrive in spawn order, which the reach rule relies on.
  const speed = lerp(tuning.fallSpeed, tuning.fallSpeedEnd, p);
  const arrival = now + fallDistance / speed;

  const lastGood = recent.findLast((d) => !isBad(d.kind));
  let lo = EDGE;
  let hi = FIELD_W - EDGE;
  if (!isBad(kind) && lastGood) {
    const reach = REACH_SPEED * Math.max(0, arrival - lastGood.arrival) + CATCH_SLACK * 0.5;
    lo = Math.max(lo, lastGood.x - reach);
    hi = Math.min(hi, lastGood.x + reach);
  }

  const clashes = (x: number) =>
    recent.some(
      (d) =>
        isBad(d.kind) !== isBad(kind) &&
        Math.abs(d.arrival - arrival) < CLASH_S &&
        Math.abs(d.x - x) < SAFE_GAP,
    );

  let x = lo + rand() * (hi - lo);
  for (let i = 0; i < 8 && clashes(x); i++) x = lo + rand() * (hi - lo);
  // Still clashing in a narrow window: a good drop falls back to the safe spot (the last good x
  // is always reachable); a bad drop is simply moved to the far side of the field.
  if (clashes(x)) x = isBad(kind) ? (x < FIELD_W / 2 ? FIELD_W - EDGE : EDGE) : (lastGood?.x ?? x);
  return { kind, x, speed, arrival };
}
