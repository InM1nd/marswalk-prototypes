import Matter from 'matter-js';

// Fixed-size pool shared by obstacles and coins — same "park off-screen,
// reuse" logic for both (spec calls these ObstacleSpawner/CollectibleSpawner,
// merged here since the pooling behavior is identical and only the body
// shape/label differ). Avoids Matter.World.add/remove per spawn, which is
// the GC-pause source that shows up as FPS micro-freezes on low-end Android.
const PARKED_X = -999;
const PARKED_Y = -999;

export class EntityPool {
  private pool: Matter.Body[] = [];

  constructor(world: Matter.World, size: number, makeBody: () => Matter.Body) {
    for (let i = 0; i < size; i++) {
      const body = makeBody();
      Matter.Body.setStatic(body, true);
      Matter.Body.setPosition(body, { x: PARKED_X, y: PARKED_Y });
      Matter.World.add(world, body);
      this.pool.push(body);
    }
  }

  /** Returns the spawned body, or null if the pool is exhausted (spawn is silently skipped). */
  spawn(x: number, y: number): Matter.Body | null {
    const free = this.pool.find((b) => b.position.x < 0);
    if (!free) return null;
    Matter.Body.setPosition(free, { x, y });
    free.plugin.scored = false;
    free.plugin.passed = false;
    free.plugin.kind = undefined;
    return free;
  }

  recycle(body: Matter.Body): void {
    Matter.Body.setPosition(body, { x: PARKED_X, y: PARKED_Y });
    body.plugin.scored = false;
    body.plugin.passed = false;
    body.plugin.kind = undefined;
  }

  active(): Matter.Body[] {
    return this.pool.filter((b) => b.position.x > PARKED_X);
  }

  /** Full pool, including parked bodies — for setting up one sprite per body up front. */
  all(): Matter.Body[] {
    return this.pool;
  }
}
