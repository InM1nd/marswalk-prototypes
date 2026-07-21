import { describe, expect, it } from 'vitest';
import Matter from 'matter-js';
import { EntityPool } from './EntityPool';

describe('EntityPool', () => {
  it('never exceeds pool size and spawn() returns null when exhausted', () => {
    const world = Matter.World.create({});
    const pool = new EntityPool(world, 2, () => Matter.Bodies.rectangle(0, 0, 10, 10));

    expect(pool.spawn(100, 0)).not.toBeNull();
    expect(pool.spawn(200, 0)).not.toBeNull();
    expect(pool.spawn(300, 0)).toBeNull(); // pool exhausted — must not throw or grow

    expect(world.bodies.length).toBe(2);
  });

  it('recycle() parks the body off-screen and active() excludes it', () => {
    const world = Matter.World.create({});
    const pool = new EntityPool(world, 1, () => Matter.Bodies.rectangle(0, 0, 10, 10));

    const body = pool.spawn(100, 0)!;
    expect(pool.active()).toEqual([body]);

    pool.recycle(body);
    expect(pool.active()).toEqual([]);

    // recycled slot is free again
    expect(pool.spawn(150, 0)).toBe(body);
  });
});
