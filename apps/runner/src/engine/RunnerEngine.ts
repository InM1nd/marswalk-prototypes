import Matter from 'matter-js';
import { Application, Container, Graphics, Text } from 'pixi.js';
import type { RunnerConfig } from '../config/schema';
import { EntityPool } from './EntityPool';
import { InputController } from './InputController';
import { patternGapMs, pickPattern, type ObstacleKind, type PendingSpawn } from './spawnPatterns';
import { sfx } from './sound';
import { comboMultiplier, useGameStore } from '../store/gameStore';
import {
  buildScooterView,
  drawBarrier,
  drawBuilding,
  drawCone,
  drawRideToken,
  makeFloatLabel,
} from './visuals';

export interface RunnerEngineOptions {
  container: HTMLElement;
  config: RunnerConfig;
  onReady?: () => void;
}

const GROUND_HEIGHT = 24;
const PLAYER_X = 90;
const PLAYER_RADIUS = 18;
const CONE_SIZE = { width: 34, height: 46 };
const BARRIER_SIZE = { width: 32, height: 72 };
const COIN_RADIUS = 12;
const COIN_HEIGHTS = [86, 126, 166];
const POOL_SIZE = 10;
const MAX_SPEED = 15;
const NEAR_MISS_PX = 22;
const COMBO_WINDOW_S = 1.6;
const DEATH_DURATION_S = 0.38;
const DEATH_TIME_SCALE = 0.28;

interface FloatFx {
  view: Text;
  life: number;
  vy: number;
}

export class RunnerEngine {
  private app: Application | null = null;
  private engine: Matter.Engine | null = null;
  private input: InputController | null = null;
  private destroyed = false;
  private options: RunnerEngineOptions;

  private player!: Matter.Body;
  private ground!: Matter.Body;
  private cones!: EntityPool;
  private barriers!: EntityPool;
  private coins!: EntityPool;
  private bodySprites = new Map<Matter.Body, Container | Graphics>();

  private worldLayer = new Container();
  private farSkyline: Graphics[] = [];
  private farLayer = new Container();
  private midSkyline: Graphics[] = [];
  private midLayer = new Container();
  private nearProps: Graphics[] = [];
  private nearLayer = new Container();
  private roadLayer = new Container();
  private roadFill = new Graphics();
  private roadMarks: Graphics[] = [];
  private stripes: Graphics[] = [];
  private stripesLayer = new Container();
  private floatLayer = new Container();
  private flashGfx = new Graphics();
  private fadeGfx = new Graphics();
  private floats: FloatFx[] = [];

  private playerRoot!: Container;
  private playerBody!: Container;
  private rearWheel!: Graphics;
  private frontWheel!: Graphics;

  private jumpsRemaining = 2;
  private elapsed = 0;
  private scrollOffset = 0;
  private groundY = 0;
  private shake = 0;
  private flash = 0;
  private fade = 0;
  private playerScale = { x: 1, y: 1 };
  private lean = 0;
  private bobPhase = 0;
  private wheelAngle = 0;
  private wasAirborne = false;
  private comboTimer = 0;
  private dying = false;
  private deathT = 0;
  private deathTilt = 0;
  private currentSpeed = 6;

  private pending: PendingSpawn[] = [];
  private patternCooldown = 0;

  constructor(options: RunnerEngineOptions) {
    this.options = options;
  }

  async mount(): Promise<void> {
    const { container, config } = this.options;
    const app = new Application();
    await app.init({
      resizeTo: container,
      background: config.branding.bgColor,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    });
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }
    this.app = app;
    container.appendChild(app.canvas);

    this.buildPhysics();
    this.buildScene();
    this.input = new InputController(app.canvas);

    app.ticker.add(this.tick);
    app.renderer.on('resize', () => this.onResize());
    this.onResize();

    this.options.onReady?.();
  }

  private buildPhysics(): void {
    const { physics } = this.options.config;
    const engine = Matter.Engine.create({ gravity: { y: physics.gravity } });
    this.engine = engine;

    this.ground = Matter.Bodies.rectangle(0, 0, 10, GROUND_HEIGHT, { isStatic: true, label: 'ground', friction: 0 });
    this.player = Matter.Bodies.circle(PLAYER_X, 0, PLAYER_RADIUS, {
      label: 'player',
      friction: 0,
      frictionAir: 0.001,
      restitution: 0,
    });
    Matter.World.add(engine.world, [this.ground, this.player]);

    this.cones = new EntityPool(engine.world, POOL_SIZE, () =>
      Matter.Bodies.rectangle(0, 0, CONE_SIZE.width, CONE_SIZE.height, { label: 'obstacle', isStatic: true }),
    );
    this.barriers = new EntityPool(engine.world, Math.ceil(POOL_SIZE / 2), () =>
      Matter.Bodies.rectangle(0, 0, BARRIER_SIZE.width, BARRIER_SIZE.height, { label: 'obstacle', isStatic: true }),
    );
    this.coins = new EntityPool(engine.world, POOL_SIZE, () =>
      Matter.Bodies.circle(0, 0, COIN_RADIUS, { label: 'coin', isStatic: true, isSensor: true }),
    );

    Matter.Events.on(engine, 'collisionStart', (evt) => {
      if (this.dying) return;
      for (const { bodyA, bodyB } of evt.pairs) {
        const other = bodyA.label === 'player' ? bodyB : bodyB.label === 'player' ? bodyA : null;
        if (!other || (bodyA.label !== 'player' && bodyB.label !== 'player')) continue;

        if (other.label === 'ground') {
          this.jumpsRemaining = 2;
          if (this.wasAirborne) {
            this.playerScale = { x: 1.28, y: 0.72 };
            this.wasAirborne = false;
          }
        } else if (other.label === 'obstacle') {
          this.beginDeath();
        } else if (other.label === 'coin' && !other.plugin.scored) {
          other.plugin.scored = true;
          this.awardPoints(10, other.position.x, other.position.y, true);
          this.coins.recycle(other);
        }
      }
    });
  }

  private buildScene(): void {
    const app = this.app!;
    const { primaryColor, secondaryColor } = this.options.config.branding;
    const primary = Number.parseInt(primaryColor.slice(1), 16);
    const secondary = Number.parseInt(secondaryColor.slice(1), 16);

    app.stage.addChild(this.worldLayer);
    this.worldLayer.addChild(this.farLayer, this.midLayer, this.nearLayer, this.roadLayer, this.stripesLayer);

    for (let i = 0; i < 14; i++) {
      const height = 28 + (i % 5) * 14;
      const building = new Graphics();
      drawBuilding(building, 56, height, 0x0f141c, 0x1c2836);
      this.farLayer.addChild(building);
      this.farSkyline.push(building);
    }

    for (let i = 0; i < 16; i++) {
      const height = 52 + (i % 4) * 24;
      const building = new Graphics();
      drawBuilding(building, 70, height, 0x151d27, 0x2c3b4d);
      this.midLayer.addChild(building);
      this.midSkyline.push(building);
    }

    for (let i = 0; i < 10; i++) {
      const lamp = new Graphics()
        .rect(-2, -54, 4, 54)
        .fill(0x243041)
        .circle(0, -58, 5)
        .fill(secondary)
        .circle(0, -58, 10)
        .fill({ color: secondary, alpha: 0.18 });
      this.nearLayer.addChild(lamp);
      this.nearProps.push(lamp);
    }

    this.roadLayer.addChild(this.roadFill);
    for (let i = 0; i < 28; i++) {
      const mark = new Graphics().roundRect(0, 0, 22, 4, 1).fill(secondary);
      this.roadLayer.addChild(mark);
      this.roadMarks.push(mark);
    }

    for (let i = 0; i < 24; i++) {
      const stripe = new Graphics().rect(0, 0, 3, GROUND_HEIGHT).fill(0x1e2733);
      this.stripesLayer.addChild(stripe);
      this.stripes.push(stripe);
    }

    const scooter = buildScooterView(primary, secondary);
    this.playerRoot = scooter.root;
    this.playerBody = scooter.body;
    this.rearWheel = scooter.rearWheel;
    this.frontWheel = scooter.frontWheel;
    this.worldLayer.addChild(this.playerRoot);
    this.bodySprites.set(this.player, this.playerRoot);

    for (const body of this.cones.all()) {
      const gfx = new Graphics();
      drawCone(gfx, primary);
      body.plugin.kind = 'cone';
      this.worldLayer.addChild(gfx);
      this.bodySprites.set(body, gfx);
    }
    for (const body of this.barriers.all()) {
      const gfx = new Graphics();
      drawBarrier(gfx, primary, secondary);
      body.plugin.kind = 'barrier';
      this.worldLayer.addChild(gfx);
      this.bodySprites.set(body, gfx);
    }
    for (const body of this.coins.all()) {
      const gfx = new Graphics();
      drawRideToken(gfx, secondary);
      this.worldLayer.addChild(gfx);
      this.bodySprites.set(body, gfx);
    }

    this.worldLayer.addChild(this.floatLayer);
    this.flashGfx.alpha = 0;
    this.fadeGfx.alpha = 0;
    app.stage.addChild(this.flashGfx, this.fadeGfx);
  }

  private onResize(): void {
    const app = this.app;
    const engine = this.engine;
    if (!app || !engine || app.screen.width === 0) return;
    this.groundY = app.screen.height - GROUND_HEIGHT / 2 - 20;

    Matter.World.remove(engine.world, this.ground);
    this.ground = Matter.Bodies.rectangle(app.screen.width / 2, this.groundY, app.screen.width * 2, GROUND_HEIGHT, {
      isStatic: true,
      label: 'ground',
      friction: 0,
    });
    Matter.World.add(engine.world, this.ground);

    Matter.Body.setPosition(this.player, { x: PLAYER_X, y: this.groundY - GROUND_HEIGHT / 2 - PLAYER_RADIUS });

    this.roadFill.clear().rect(-40, 0, app.screen.width + 80, GROUND_HEIGHT + 36).fill(0x121820);
    this.flashGfx.clear().rect(0, 0, app.screen.width, app.screen.height).fill(0xffffff);
    this.flashGfx.alpha = 0;
    this.fadeGfx.clear().rect(0, 0, app.screen.width, app.screen.height).fill(0x0a0e14);
    this.fadeGfx.alpha = 0;
  }

  start(): void {
    const { round, physics } = this.options.config;
    this.elapsed = 0;
    this.patternCooldown = 0;
    this.pending = [];
    this.jumpsRemaining = 2;
    this.shake = 0;
    this.flash = 0;
    this.fade = 0;
    this.playerScale = { x: 1, y: 1 };
    this.lean = 0;
    this.bobPhase = 0;
    this.wheelAngle = 0;
    this.wasAirborne = false;
    this.comboTimer = 0;
    this.dying = false;
    this.deathT = 0;
    this.deathTilt = 0;
    this.currentSpeed = physics.baseSpeed;
    for (const fx of this.floats) fx.view.destroy();
    this.floats = [];
    this.floatLayer.removeChildren();
    for (const body of this.cones.all()) this.cones.recycle(body);
    for (const body of this.barriers.all()) this.barriers.recycle(body);
    for (const body of this.coins.all()) this.coins.recycle(body);
    this.playerRoot.rotation = 0;
    this.playerBody.rotation = 0;
    Matter.Body.setPosition(this.player, { x: PLAYER_X, y: this.groundY - GROUND_HEIGHT / 2 - PLAYER_RADIUS });
    Matter.Body.setVelocity(this.player, { x: 0, y: 0 });
    useGameStore.getState().reset(round.durationSeconds);
    useGameStore.getState().setStatus('playing');
  }

  private beginDeath(): void {
    if (this.dying || useGameStore.getState().status !== 'playing') return;
    this.dying = true;
    this.deathT = DEATH_DURATION_S;
    this.deathTilt = 0;
    this.shake = 16;
    this.flash = 0.6;
    this.fade = 0;
    useGameStore.getState().resetCombo();
    if (!useGameStore.getState().muted) sfx.hit();
  }

  private finishDeath(): void {
    this.dying = false;
    useGameStore.getState().setStatus('gameover');
  }

  private awardPoints(base: number, x: number, y: number, isCoin: boolean, label?: string): void {
    const store = useGameStore.getState();
    const combo = store.bumpCombo();
    this.comboTimer = COMBO_WINDOW_S;
    const mult = comboMultiplier(combo);
    const points = base * mult;
    store.addScore(points);
    if (!store.muted) {
      if (isCoin) sfx.coin(combo);
      else sfx.nearMiss();
    }
    const text = label ?? (mult > 1 ? `+${points} x${mult}` : `+${points}`);
    this.spawnFloat(x, y, text);
  }

  private spawnFloat(x: number, y: number, label: string): void {
    const view = makeFloatLabel(label, this.options.config.branding.secondaryColor);
    view.anchor.set(0.5);
    view.x = x;
    view.y = y;
    this.floatLayer.addChild(view);
    this.floats.push({ view, life: 0.75, vy: -52 });
  }

  private tick = (): void => {
    const app = this.app;
    const engine = this.engine;
    if (!app || !engine) return;

    const deltaMs = Math.min(app.ticker.deltaMS, 1000 / 60);
    const deltaSeconds = deltaMs / 1000;

    this.syncParallax();
    this.updateJuice(deltaSeconds);
    this.animateScooter(deltaSeconds);

    if (this.dying) {
      this.tickDeath(deltaMs, deltaSeconds);
      this.syncSprites();
      return;
    }

    if (useGameStore.getState().status !== 'playing') {
      this.syncSprites();
      return;
    }

    const { physics } = this.options.config;
    this.elapsed += deltaSeconds;
    this.currentSpeed = Math.min(physics.baseSpeed + this.elapsed * physics.speedRampPerSecond, MAX_SPEED);
    const moveBy = this.currentSpeed * (deltaMs / (1000 / 60));

    if (this.comboTimer > 0) {
      this.comboTimer -= deltaSeconds;
      if (this.comboTimer <= 0) useGameStore.getState().resetCombo();
    }

    if (this.input?.consumeJump()) {
      const velocity = jumpVelocity(this.jumpsRemaining, physics.jumpForce);
      if (velocity !== null) {
        Matter.Body.setVelocity(this.player, { x: this.player.velocity.x, y: velocity });
        this.jumpsRemaining--;
        this.wasAirborne = true;
        this.playerScale = { x: 0.78, y: 1.22 };
        if (!useGameStore.getState().muted) sfx.jump();
      }
    }

    Matter.Engine.update(engine, deltaMs);

    if (this.player.velocity.y < -1 || this.player.velocity.y > 1) this.wasAirborne = true;

    this.advancePatterns(deltaMs);
    this.scrollActiveBodies(moveBy);
    this.checkNearMisses();
    useGameStore.getState().tickTime(deltaSeconds);
    if (useGameStore.getState().timeLeft <= 0) {
      this.shake = 8;
      this.flash = 0.25;
      useGameStore.getState().setStatus('gameover');
    }

    this.syncSprites();
  };

  private tickDeath(deltaMs: number, deltaSeconds: number): void {
    this.deathT -= deltaSeconds;
    this.deathTilt += deltaSeconds * 2.8;
    this.fade = Math.min(0.55, this.fade + deltaSeconds * 1.4);
    this.fadeGfx.alpha = this.fade;
    this.playerRoot.rotation = this.deathTilt;
    this.playerScale = { x: 1.05, y: 0.9 };

    Matter.Engine.update(this.engine!, deltaMs * DEATH_TIME_SCALE);
    this.scrollActiveBodies(this.currentSpeed * (deltaMs / (1000 / 60)) * DEATH_TIME_SCALE);

    if (this.deathT <= 0) this.finishDeath();
  }

  private advancePatterns(deltaMs: number): void {
    if (this.pending.length > 0) {
      this.pending[0].delayMs -= deltaMs;
      while (this.pending.length > 0 && this.pending[0].delayMs <= 0) {
        this.spawnFromPattern(this.pending.shift()!);
      }
      if (this.pending.length === 0) this.patternCooldown = patternGapMs();
      return;
    }

    this.patternCooldown -= deltaMs;
    if (this.patternCooldown <= 0) {
      this.pending = pickPattern().map((p) => ({ ...p }));
    }
  }

  private spawnFromPattern(spawn: PendingSpawn): void {
    const app = this.app!;
    if (spawn.kind === 'obstacle') {
      const kind: ObstacleKind = spawn.obstacleKind ?? 'cone';
      if (kind === 'barrier') {
        const y = this.groundY - GROUND_HEIGHT / 2 - BARRIER_SIZE.height / 2;
        const body = this.barriers.spawn(app.screen.width + BARRIER_SIZE.width, y);
        if (body) body.plugin.kind = 'barrier';
      } else {
        const y = this.groundY - GROUND_HEIGHT / 2 - CONE_SIZE.height / 2;
        const body = this.cones.spawn(app.screen.width + CONE_SIZE.width, y);
        if (body) body.plugin.kind = 'cone';
      }
      return;
    }

    const heightIndex = spawn.coinHeightIndex ?? 1;
    this.coins.spawn(
      app.screen.width + COIN_RADIUS,
      this.groundY - COIN_HEIGHTS[heightIndex % COIN_HEIGHTS.length],
    );
  }

  private checkNearMisses(): void {
    for (const body of [...this.cones.active(), ...this.barriers.active()]) {
      if (body.plugin.passed || body.plugin.scored) continue;
      const halfW = (body.plugin.kind === 'barrier' ? BARRIER_SIZE.width : CONE_SIZE.width) / 2;
      if (body.position.x + halfW > PLAYER_X - PLAYER_RADIUS) continue;

      body.plugin.passed = true;
      const halfH = (body.plugin.kind === 'barrier' ? BARRIER_SIZE.height : CONE_SIZE.height) / 2;
      const obstacleTop = body.position.y - halfH;
      const playerBottom = this.player.position.y + PLAYER_RADIUS;
      if (playerBottom < obstacleTop) {
        body.plugin.scored = true;
        useGameStore.getState().addScore(1);
        const clearance = obstacleTop - playerBottom;
        if (clearance < NEAR_MISS_PX) {
          this.awardPoints(5, body.position.x, playerBottom - 10, false, 'CLOSE!');
          this.playerScale = { x: 1.12, y: 0.9 };
        }
      }
    }
  }

  private scrollActiveBodies(speed: number): void {
    for (const body of [...this.cones.active(), ...this.barriers.active(), ...this.coins.active()]) {
      const nextX = body.position.x - speed;
      if (nextX < -50) {
        if (body.label === 'obstacle' && !body.plugin.scored && body.plugin.passed) {
          // already scored on pass
        } else if (body.label === 'obstacle' && !body.plugin.scored) {
          body.plugin.scored = true;
          useGameStore.getState().addScore(1);
        }
        const pool = body.plugin.kind === 'barrier' ? this.barriers : body.label === 'coin' ? this.coins : this.cones;
        pool.recycle(body);
      } else {
        Matter.Body.setPosition(body, { x: nextX, y: body.position.y });
      }
    }
    this.scrollOffset += speed;
  }

  private animateScooter(deltaSeconds: number): void {
    const grounded = this.jumpsRemaining === 2 && !this.wasAirborne && !this.dying;
    const targetLean = this.dying ? this.deathTilt : Math.min(0.22, (this.currentSpeed - 6) * 0.03) + (this.wasAirborne ? -0.08 : 0.05);
    this.lean += (targetLean - this.lean) * Math.min(1, deltaSeconds * 8);

    if (grounded && useGameStore.getState().status === 'playing') {
      this.bobPhase += deltaSeconds * (8 + this.currentSpeed * 0.4);
      this.playerBody.y = Math.sin(this.bobPhase) * 2.2;
    } else {
      this.playerBody.y += (0 - this.playerBody.y) * Math.min(1, deltaSeconds * 10);
    }

    this.playerBody.rotation = this.dying ? 0 : this.lean;
    this.wheelAngle += this.currentSpeed * deltaSeconds * 0.55;
    this.rearWheel.rotation = this.wheelAngle;
    this.frontWheel.rotation = this.wheelAngle;
  }

  private updateJuice(deltaSeconds: number): void {
    this.playerScale.x += (1 - this.playerScale.x) * Math.min(1, deltaSeconds * 12);
    this.playerScale.y += (1 - this.playerScale.y) * Math.min(1, deltaSeconds * 12);

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - deltaSeconds * 42);
      this.worldLayer.x = (Math.random() - 0.5) * this.shake;
      this.worldLayer.y = (Math.random() - 0.5) * this.shake;
    } else {
      this.worldLayer.x = 0;
      this.worldLayer.y = 0;
    }

    this.flashGfx.alpha = this.flash > 0 ? this.flash : 0;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - deltaSeconds * 2.8);

    for (let i = this.floats.length - 1; i >= 0; i--) {
      const fx = this.floats[i];
      fx.life -= deltaSeconds;
      fx.view.y += fx.vy * deltaSeconds;
      fx.view.alpha = Math.max(0, fx.life / 0.75);
      fx.view.scale.set(1 + (0.75 - fx.life) * 0.35);
      if (fx.life <= 0) {
        this.floatLayer.removeChild(fx.view);
        fx.view.destroy();
        this.floats.splice(i, 1);
      }
    }
  }

  private syncParallax(): void {
    const place = (items: Graphics[], spacing: number, factor: number, y: number, xBias = 0) => {
      const total = items.length * spacing;
      items.forEach((item, i) => {
        item.y = y;
        item.x = ((i * spacing - this.scrollOffset * factor) % total + total) % total - spacing + xBias;
      });
    };

    place(this.farSkyline, 72, 0.08, this.groundY - GROUND_HEIGHT / 2);
    place(this.midSkyline, 86, 0.22, this.groundY - GROUND_HEIGHT / 2);
    place(this.nearProps, 140, 0.55, this.groundY - GROUND_HEIGHT / 2, 20);

    this.roadLayer.y = this.groundY - GROUND_HEIGHT / 2;
    const markSpacing = 48;
    const markTotal = this.roadMarks.length * markSpacing;
    this.roadMarks.forEach((mark, i) => {
      mark.y = GROUND_HEIGHT / 2 + 8;
      mark.x = ((i * markSpacing - this.scrollOffset) % markTotal + markTotal) % markTotal;
    });

    const spacing = 40;
    const total = this.stripes.length * spacing;
    this.stripes.forEach((stripe, i) => {
      stripe.y = this.groundY - GROUND_HEIGHT / 2;
      stripe.x = ((i * spacing - this.scrollOffset) % total + total) % total;
    });
  }

  private syncSprites(): void {
    for (const [body, gfx] of this.bodySprites) {
      gfx.x = body.position.x;
      gfx.y = body.position.y;
      gfx.visible = body.position.x > -500;
      if (body.label === 'player') {
        gfx.scale.set(this.playerScale.x, this.playerScale.y);
      } else {
        gfx.rotation = body.angle;
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.input?.destroy();
    for (const fx of this.floats) fx.view.destroy();
    this.floats = [];
    if (this.engine) Matter.Engine.clear(this.engine);
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.engine = null;
  }
}

export function jumpVelocity(jumpsRemaining: number, baseJumpForce: number): number | null {
  if (jumpsRemaining < 1) return null;
  return jumpsRemaining === 2 ? baseJumpForce : baseJumpForce * 0.86;
}
