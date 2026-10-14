import Matter from 'matter-js';
import { Application, Container, Graphics, Sprite, Text, TilingSprite, type Texture } from 'pixi.js';
import type { RunnerConfig } from '../config/schema';
import { EntityPool } from './EntityPool';
import { InputController } from './InputController';
import { patternGapMs, pickPattern, type ObstacleKind, type PendingSpawn } from './spawnPatterns';
import { sfx } from './sound';
import { comboMultiplier, useGameStore } from '../store/gameStore';
import * as art from './art';

export interface RunnerEngineOptions {
  container: HTMLElement;
  config: RunnerConfig;
  onReady?: () => void;
}

/**
 * Logical camera: the world is always ~360 units wide in portrait (phones and the
 * desktop 9:16 frame alike), so difficulty doesn't depend on the screen. The stage is
 * scaled to fit; physics, spawns and art all live in logical units, ground top at y = 0.
 */
const VIEW_W = 360;
const MIN_VIEW_H = 560;
const GROUND_LINE = 0.76;

const GROUND_HEIGHT = 24;
const PLAYER_X = 74;
const PLAYER_RADIUS = 18;
const HERO_SCALE = 0.78;
const CONE_SIZE = { width: 34, height: 46 };
const BARRIER_SIZE = { width: 32, height: 72 };
const COIN_RADIUS = 12;
const COIN_HEIGHTS = [30, 86, 126, 160];
const POOL_SIZE = 10;
const MAX_SPEED_FACTOR = 2.3;
const NEAR_MISS_PX = 22;
const COMBO_WINDOW_S = 1.6;
const DEATH_DURATION_S = 0.45;
const DEATH_TIME_SCALE = 0.28;
const BILLBOARD_SPACING = 520;

interface FloatFx {
  view: Text;
  life: number;
  maxLife: number;
  vy: number;
}

export class RunnerEngine {
  private app: Application | null = null;
  private engine: Matter.Engine | null = null;
  private input: InputController | null = null;
  private destroyed = false;
  private options: RunnerEngineOptions;
  private textures: Texture[] = [];

  private player!: Matter.Body;
  private ground!: Matter.Body;
  private cones!: EntityPool;
  private barriers!: EntityPool;
  private coins!: EntityPool;
  private bodySprites = new Map<Matter.Body, Container>();
  private coinFaces = new Map<Matter.Body, Sprite>();

  private view = { w: VIEW_W, h: 640, groundY: 486 };
  private sky!: Sprite;
  private horizon!: Sprite;
  private starfield!: TilingSprite;
  private far!: TilingSprite;
  private mid!: TilingSprite;
  private near!: TilingSprite;
  private road!: TilingSprite;
  private billboards: Container[] = [];
  private worldLayer = new Container();
  private floatLayer = new Container();
  private flashGfx = new Graphics();
  private fadeGfx = new Graphics();
  private floats: FloatFx[] = [];

  private playerRoot = new Container();
  private rig = new Container();
  private heroShadow = new Graphics();
  private riderSprite!: Sprite;
  private wheels: Sprite[] = [];

  private jumpsRemaining = 2;
  private elapsed = 0;
  private scrollOffset = 0;
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
  private currentSpeed = 3;
  private clock = 0;

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

    await Promise.all([this.loadArt(), document.fonts.load(`800 24px "${config.branding.fontFamily}"`).catch(() => undefined)]);
    if (this.destroyed) {
      for (const t of this.textures) t.destroy(true);
      this.textures = [];
      return;
    }

    this.buildPhysics();
    this.buildScene();
    this.input = new InputController(app.canvas);

    app.ticker.add(this.tick);
    app.renderer.on('resize', () => this.onResize());
    this.onResize();
    this.syncParallax();
    this.syncSprites();

    if (import.meta.env.DEV) (window as unknown as { __runner?: RunnerEngine }).__runner = this;
    this.options.onReady?.();
  }

  private artTextures!: Record<'rider' | 'wheel' | 'cone' | 'barrier' | 'coin' | 'coinGlow' | 'sky' | 'horizon' | 'stars' | 'far' | 'mid' | 'near' | 'road', Texture>;

  private async loadArt(): Promise<void> {
    const b = { primary: this.options.config.branding.primaryColor, secondary: this.options.config.branding.secondaryColor };
    // Raster at the device scale so sprites stay crisp on retina; capped to bound GPU memory.
    const res = Math.min(3, Math.max(1.5, window.devicePixelRatio * 1.25));
    const entries = {
      rider: [art.courierBody(b), res, false],
      wheel: [art.wheel(b), res, false],
      cone: [art.cone(b), res, false],
      barrier: [art.barrier(b), res, false],
      coin: [art.coin(b), res, false],
      coinGlow: [art.glow(b.secondary), 1, false],
      sky: [art.sky(b), 1, false],
      horizon: [art.horizonGlow(b), 1, false],
      stars: [art.stars(), res, true],
      far: [art.farCity(), res, true],
      mid: [art.midCity(b), res, true],
      near: [art.nearStreet(b), res, true],
      road: [art.road(b), res, true],
    } as const;
    const keys = Object.keys(entries) as Array<keyof typeof entries>;
    const loaded = await Promise.all(keys.map((k) => {
      const [a, r, repeat] = entries[k];
      return art.svgTexture(a, r, repeat);
    }));
    this.textures = loaded;
    this.artTextures = Object.fromEntries(keys.map((k, i) => [k, loaded[i]])) as typeof this.artTextures;
  }

  private buildPhysics(): void {
    const { physics } = this.options.config;
    const engine = Matter.Engine.create({ gravity: { y: physics.gravity } });
    this.engine = engine;

    // Ground is static in logical space; resizing the screen never touches physics.
    this.ground = Matter.Bodies.rectangle(VIEW_W, GROUND_HEIGHT / 2, 6000, GROUND_HEIGHT, { isStatic: true, label: 'ground', friction: 0 });
    this.player = Matter.Bodies.circle(PLAYER_X, -PLAYER_RADIUS, PLAYER_RADIUS, {
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
    this.coins = new EntityPool(engine.world, 16, () =>
      Matter.Bodies.circle(0, 0, COIN_RADIUS, { label: 'coin', isStatic: true, isSensor: true }),
    );

    Matter.Events.on(engine, 'collisionStart', (evt) => {
      if (this.dying) return;
      for (const { bodyA, bodyB } of evt.pairs) {
        const other = bodyA.label === 'player' ? bodyB : bodyB.label === 'player' ? bodyA : null;
        if (!other) continue;

        if (other.label === 'ground') {
          this.jumpsRemaining = 2;
          if (this.wasAirborne) {
            this.playerScale = { x: 1.22, y: 0.8 };
            this.wasAirborne = false;
            if (useGameStore.getState().status === 'playing' && !useGameStore.getState().muted) sfx.land();
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
    const t = this.artTextures;
    const { config } = this.options;

    this.sky = new Sprite(t.sky);
    this.horizon = new Sprite(t.horizon);
    this.horizon.anchor.set(0.5, 1);
    this.starfield = new TilingSprite({ texture: t.stars, width: VIEW_W, height: t.stars.height });
    app.stage.addChild(this.sky, this.starfield, this.horizon, this.worldLayer);

    this.far = new TilingSprite({ texture: t.far, width: VIEW_W, height: t.far.height });
    this.far.y = -t.far.height;
    this.mid = new TilingSprite({ texture: t.mid, width: VIEW_W, height: t.mid.height });
    this.mid.y = -t.mid.height;
    this.near = new TilingSprite({ texture: t.near, width: VIEW_W, height: t.near.height });
    this.near.y = -art.NEAR_GROUND;
    this.road = new TilingSprite({ texture: t.road, width: VIEW_W, height: t.road.height });

    const billboardLayer = new Container();
    for (let i = 0; i < 2; i++) {
      const board = this.makeBillboard();
      this.billboards.push(board);
      billboardLayer.addChild(board);
    }
    this.worldLayer.addChild(this.far, this.mid, billboardLayer, this.road, this.near);

    for (const body of this.cones.all()) this.addEntity(body, new Sprite(t.cone), art.cone, CONE_SIZE.height);
    for (const body of this.barriers.all()) this.addEntity(body, new Sprite(t.barrier), art.barrier, BARRIER_SIZE.height);
    for (const body of this.coins.all()) {
      const root = new Container();
      const halo = new Sprite(t.coinGlow);
      halo.anchor.set(0.5);
      halo.blendMode = 'add';
      halo.scale.set(0.9);
      const face = new Sprite(t.coin);
      face.anchor.set(0.5);
      root.addChild(halo, face);
      this.coinFaces.set(body, face);
      this.worldLayer.addChild(root);
      this.bodySprites.set(body, root);
    }

    // Hero rig: origin at the ground contact point, so squash and lean pivot on the wheels.
    const rider = art.courierBody({ primary: config.branding.primaryColor, secondary: config.branding.secondaryColor });
    this.riderSprite = new Sprite(t.rider);
    this.riderSprite.anchor.set(-rider.x / rider.w, -rider.y / rider.h);
    this.rig.addChild(this.riderSprite);
    for (const pos of art.WHEEL_POSITIONS) {
      const w = new Sprite(t.wheel);
      w.anchor.set(0.5);
      w.position.set(pos.x, pos.y);
      this.wheels.push(w);
      this.rig.addChild(w);
    }
    this.rig.scale.set(HERO_SCALE);
    this.rig.y = PLAYER_RADIUS;
    // Ground shadow stays on the road and shrinks as the hero rises.
    this.heroShadow.ellipse(0, 1, 30, 4).fill({ color: 0x000000, alpha: 0.45 });
    this.heroShadow.x = PLAYER_X;
    this.playerRoot.addChild(this.rig);
    this.worldLayer.addChild(this.heroShadow, this.playerRoot);
    this.bodySprites.set(this.player, this.playerRoot);

    this.worldLayer.addChild(this.floatLayer);
    this.flashGfx.alpha = 0;
    this.fadeGfx.alpha = 0;
    app.stage.addChild(this.flashGfx, this.fadeGfx);
  }

  /** Sprite anchored so the body centre (middle of the hitbox) maps onto the art. */
  private addEntity(body: Matter.Body, sprite: Sprite, make: (b: art.Brand) => art.Art, hitHeight: number): void {
    const a = make({ primary: '#000', secondary: '#000' });
    sprite.anchor.set(-a.x / a.w, (-hitHeight / 2 - a.y) / a.h);
    this.worldLayer.addChild(sprite);
    this.bodySprites.set(body, sprite);
  }

  private makeBillboard(): Container {
    const { branding, billboard } = this.options.config;
    const primary = branding.primaryColor;
    const root = new Container();
    const W = 116;
    const H = 66;
    const g = new Graphics();
    g.rect(W / 2 - 22, H, 4, 140).fill(0x0f111c).rect(W / 2 + 18, H, 4, 140).fill(0x0f111c);
    for (let i = 4; i >= 1; i--) g.roundRect(-i * 3, -i * 3, W + i * 6, H + i * 6, 10 + i * 2).fill({ color: primary, alpha: 0.07 });
    g.roundRect(0, 0, W, H, 8).fill(primary).stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
    g.roundRect(3, 3, W - 6, H * 0.45, 6).fill({ color: 0xffffff, alpha: 0.12 });
    const font = `"${branding.fontFamily}", system-ui, sans-serif`;
    const headline = new Text({ text: billboard.headline, style: { fontFamily: font, fontWeight: '800', fontSize: 26, fill: '#ffffff' } });
    headline.anchor.set(0, 0.5);
    headline.position.set(10, H / 2);
    const offer = new Text({ text: billboard.offer, style: { fontFamily: font, fontWeight: '800', fontSize: 20, fill: branding.secondaryColor } });
    offer.anchor.set(1, 0.5);
    offer.position.set(W - 10, H / 2 - 8);
    const foot = new Text({ text: billboard.footnote, style: { fontFamily: font, fontWeight: '800', fontSize: 8.5, fill: '#ffffff', letterSpacing: 1 } });
    foot.anchor.set(1, 0.5);
    foot.position.set(W - 10, H / 2 + 12);
    root.addChild(g, headline, offer, foot);
    // Text is rasterised at stage scale × device ratio so it stays sharp on retina.
    for (const t of [headline, offer, foot]) t.resolution = Math.min(window.devicePixelRatio, 2) * 2;
    return root;
  }

  private onResize(): void {
    const app = this.app;
    if (!app || app.screen.width === 0) return;
    const scale = Math.min(app.screen.width / VIEW_W, app.screen.height / MIN_VIEW_H);
    const w = app.screen.width / scale;
    const h = app.screen.height / scale;
    this.view = { w, h, groundY: Math.round(h * GROUND_LINE) };
    app.stage.scale.set(scale);

    const gy = this.view.groundY;
    this.worldLayer.y = gy;
    this.sky.setSize(w, gy + 20);
    this.starfield.width = w;
    this.horizon.position.set(w / 2, gy - 40);
    this.horizon.setSize(w * 1.6, 300);
    for (const strip of [this.far, this.mid, this.near, this.road]) strip.width = w;
    this.road.height = h - gy + 40;

    this.flashGfx.clear().rect(0, 0, w, h).fill(0xffffff);
    this.fadeGfx.clear().rect(0, 0, w, h).fill(0x05060d);
  }

  start(): void {
    const { round, physics } = this.options.config;
    this.elapsed = 0;
    this.patternCooldown = 600;
    this.pending = [];
    this.jumpsRemaining = 2;
    this.shake = 0;
    this.flash = 0;
    this.fade = 0;
    this.fadeGfx.alpha = 0;
    this.playerScale = { x: 1, y: 1 };
    this.lean = 0;
    this.bobPhase = 0;
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
    this.rig.rotation = 0;
    Matter.Body.setPosition(this.player, { x: PLAYER_X, y: -PLAYER_RADIUS });
    Matter.Body.setVelocity(this.player, { x: 0, y: 0 });
    this.input?.consumeJump();
    useGameStore.getState().reset(round.durationSeconds);
    useGameStore.getState().setStatus('playing');
  }

  private beginDeath(): void {
    if (this.dying || useGameStore.getState().status !== 'playing') return;
    this.dying = true;
    this.deathT = DEATH_DURATION_S;
    this.deathTilt = 0;
    this.shake = 14;
    this.flash = 0.5;
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
    this.spawnFloat(x, y, label ?? (mult > 1 ? `+${points} ×${mult}` : `+${points}`));
  }

  private checkPrize(): void {
    const store = useGameStore.getState();
    if (store.prizeUnlocked || store.score < this.options.config.prize.threshold) return;
    store.unlockPrize();
    this.flash = 0.25;
    if (!store.muted) sfx.prize();
    this.spawnFloat(this.view.w / 2, -this.view.groundY * 0.55, 'PRIZE UNLOCKED!', 30, 1.6);
  }

  private spawnFloat(x: number, y: number, label: string, size = 20, life = 0.8): void {
    const { branding } = this.options.config;
    const view = new Text({
      text: label,
      style: {
        fontFamily: `"${branding.fontFamily}", system-ui, sans-serif`,
        fontSize: size,
        fontWeight: '800',
        fill: branding.secondaryColor,
        stroke: { color: '#14070a', width: 4, join: 'round' },
        dropShadow: { color: branding.primaryColor, alpha: 0.8, blur: 8, distance: 0 },
      },
      resolution: Math.min(window.devicePixelRatio, 2) * 1.5,
    });
    view.anchor.set(0.5);
    view.position.set(x, y);
    this.floatLayer.addChild(view);
    this.floats.push({ view, life, maxLife: life, vy: -46 });
  }

  private tick = (): void => {
    const app = this.app;
    const engine = this.engine;
    if (!app || !engine) return;

    const deltaMs = Math.min(app.ticker.deltaMS, 1000 / 30);
    const deltaSeconds = deltaMs / 1000;
    this.clock += deltaSeconds;

    const status = useGameStore.getState().status;
    // Idle/game-over: the city keeps drifting behind the overlay.
    if (status !== 'playing' && !this.dying) this.scrollOffset += 0.6 * (deltaMs / (1000 / 60));

    this.syncParallax();
    this.updateJuice(deltaSeconds);
    this.animateHero(deltaSeconds);

    if (this.dying) {
      this.tickDeath(deltaMs, deltaSeconds);
      this.syncSprites();
      return;
    }

    if (status !== 'playing') {
      this.syncSprites();
      return;
    }

    const { physics } = this.options.config;
    this.elapsed += deltaSeconds;
    this.currentSpeed = Math.min(physics.baseSpeed + this.elapsed * physics.speedRampPerSecond, physics.baseSpeed * MAX_SPEED_FACTOR);
    const frames = deltaMs / (1000 / 60);
    const moveBy = this.currentSpeed * frames;

    if (this.comboTimer > 0) {
      this.comboTimer -= deltaSeconds;
      if (this.comboTimer <= 0) useGameStore.getState().resetCombo();
    }

    if (this.input?.consumeJump()) {
      const velocity = jumpVelocity(this.jumpsRemaining, physics.jumpForce);
      if (velocity !== null) {
        const isDouble = this.jumpsRemaining === 1;
        Matter.Body.setVelocity(this.player, { x: 0, y: velocity });
        this.jumpsRemaining--;
        this.wasAirborne = true;
        this.playerScale = { x: 0.82, y: 1.2 };
        if (!useGameStore.getState().muted) (isDouble ? sfx.doubleJump : sfx.jump)();
      }
    }

    // Matter is only stable at ≤ 16.7 ms steps; sub-step on slow frames (30 fps phones).
    const steps = Math.ceil(deltaMs / (1000 / 60));
    for (let i = 0; i < steps; i++) Matter.Engine.update(engine, deltaMs / steps);
    // The hero never drifts horizontally: obstacles come to it.
    if (this.player.position.x !== PLAYER_X) Matter.Body.setPosition(this.player, { x: PLAYER_X, y: this.player.position.y });

    if (this.player.velocity.y < -1 || this.player.velocity.y > 1) this.wasAirborne = true;

    // Spawn timing is in "distance at base speed": gaps stay the same length as the run speeds up.
    this.advancePatterns(deltaMs * (this.currentSpeed / physics.baseSpeed));
    this.scrollActiveBodies(moveBy);
    this.checkNearMisses();
    this.checkPrize();
    useGameStore.getState().tickTime(deltaSeconds);
    if (useGameStore.getState().timeLeft <= 0) {
      this.flash = 0.25;
      useGameStore.getState().setStatus('gameover');
    }

    this.syncSprites();
  };

  private tickDeath(deltaMs: number, deltaSeconds: number): void {
    this.deathT -= deltaSeconds;
    this.deathTilt += deltaSeconds * 2.6;
    this.fade = Math.min(0.5, this.fade + deltaSeconds * 1.3);
    this.fadeGfx.alpha = this.fade;

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
    const right = this.view.w + 40;
    if (spawn.kind === 'obstacle') {
      const kind: ObstacleKind = spawn.obstacleKind ?? 'cone';
      if (kind === 'barrier') {
        const body = this.barriers.spawn(right, -BARRIER_SIZE.height / 2);
        if (body) body.plugin.kind = 'barrier';
      } else {
        const body = this.cones.spawn(right, -CONE_SIZE.height / 2);
        if (body) body.plugin.kind = 'cone';
      }
      return;
    }

    const heightIndex = spawn.coinHeightIndex ?? 1;
    this.coins.spawn(right, -COIN_HEIGHTS[heightIndex % COIN_HEIGHTS.length]);
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
        if (obstacleTop - playerBottom < NEAR_MISS_PX) {
          this.awardPoints(5, body.position.x, playerBottom - 10, false, 'CLOSE!');
          this.playerScale = { x: 1.12, y: 0.9 };
        }
      }
    }
  }

  private scrollActiveBodies(speed: number): void {
    for (const body of [...this.cones.active(), ...this.barriers.active(), ...this.coins.active()]) {
      const nextX = body.position.x - speed;
      if (nextX < -60) {
        if (body.label === 'obstacle' && !body.plugin.scored && !body.plugin.passed) {
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

  private animateHero(deltaSeconds: number): void {
    const playing = useGameStore.getState().status === 'playing';
    const grounded = this.jumpsRemaining === 2 && !this.wasAirborne && !this.dying;
    const speedLean = Math.min(0.12, (this.currentSpeed / this.options.config.physics.baseSpeed - 1) * 0.08);
    const targetLean = this.wasAirborne ? -0.16 : 0.03 + speedLean;
    this.lean += (targetLean - this.lean) * Math.min(1, deltaSeconds * 8);

    if (grounded) {
      this.bobPhase += deltaSeconds * (playing ? 9 + this.currentSpeed : 4);
      this.riderSprite.y = Math.sin(this.bobPhase) * (playing ? 1.6 : 0.8);
    } else {
      this.riderSprite.y += (0 - this.riderSprite.y) * Math.min(1, deltaSeconds * 10);
    }

    this.rig.rotation = this.dying ? this.lean + this.deathTilt : this.lean;
    const rolling = playing || this.dying ? this.currentSpeed : 0.6;
    this.wheelAngle += rolling * deltaSeconds * 1.6;
    for (const w of this.wheels) w.rotation = this.wheelAngle;
  }

  private updateJuice(deltaSeconds: number): void {
    this.playerScale.x += (1 - this.playerScale.x) * Math.min(1, deltaSeconds * 12);
    this.playerScale.y += (1 - this.playerScale.y) * Math.min(1, deltaSeconds * 12);

    const gy = this.view.groundY;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - deltaSeconds * 40);
      this.worldLayer.x = (Math.random() - 0.5) * this.shake;
      this.worldLayer.y = gy + (Math.random() - 0.5) * this.shake;
    } else {
      this.worldLayer.x = 0;
      this.worldLayer.y = gy;
    }

    this.flashGfx.alpha = Math.max(0, this.flash);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - deltaSeconds * 2.8);
    if (!this.dying && this.fade > 0 && useGameStore.getState().status === 'playing') {
      this.fade = 0;
      this.fadeGfx.alpha = 0;
    }

    for (let i = this.floats.length - 1; i >= 0; i--) {
      const fx = this.floats[i];
      fx.life -= deltaSeconds;
      fx.view.y += fx.vy * deltaSeconds;
      const age = 1 - fx.life / fx.maxLife;
      fx.view.alpha = Math.min(1, fx.life / (fx.maxLife * 0.4));
      fx.view.scale.set(age < 0.15 ? 0.6 + age * 3 : 1.05 + age * 0.15);
      if (fx.life <= 0) {
        this.floatLayer.removeChild(fx.view);
        fx.view.destroy();
        this.floats.splice(i, 1);
      }
    }
  }

  private syncParallax(): void {
    const s = this.scrollOffset;
    this.starfield.tilePosition.x = -s * 0.02;
    this.far.tilePosition.x = -s * 0.1;
    this.mid.tilePosition.x = -s * 0.25;
    this.road.tilePosition.x = -s;
    this.near.tilePosition.x = -s * 0.7;

    const total = BILLBOARD_SPACING * this.billboards.length;
    this.billboards.forEach((board, i) => {
      board.x = (((i * BILLBOARD_SPACING + 150 - s * 0.25) % total) + total) % total - 140;
      board.y = -205;
    });
  }

  private syncSprites(): void {
    for (const [body, gfx] of this.bodySprites) {
      gfx.x = body.position.x;
      gfx.y = body.position.y;
      gfx.visible = body.position.x > -500;
      if (body.label === 'player') {
        this.rig.scale.set(HERO_SCALE * this.playerScale.x, HERO_SCALE * this.playerScale.y);
        const lift = Math.max(0, -body.position.y - PLAYER_RADIUS);
        this.heroShadow.scale.set(Math.max(0.35, 1 - lift / 160));
        this.heroShadow.alpha = Math.max(0.25, 1 - lift / 140);
      }
    }
    for (const [body, face] of this.coinFaces) {
      if (body.position.x < -500) continue;
      face.scale.x = 0.55 + 0.45 * Math.abs(Math.cos(this.clock * 3 + body.id));
      face.y = Math.sin(this.clock * 4 + body.id) * 2;
    }
  }

  /** Dev-only probe for physics tuning (see window.__runner). */
  debugState() {
    return { y: this.player.position.y, vy: this.player.velocity.y, speed: this.currentSpeed, view: this.view, fps: this.app?.ticker.FPS };
  }

  destroy(): void {
    this.destroyed = true;
    this.input?.destroy();
    for (const fx of this.floats) fx.view.destroy();
    this.floats = [];
    if (this.engine) Matter.Engine.clear(this.engine);
    this.app?.destroy(true, { children: true });
    for (const t of this.textures) t.destroy(true);
    this.textures = [];
    this.app = null;
    this.engine = null;
  }
}

export function jumpVelocity(jumpsRemaining: number, baseJumpForce: number): number | null {
  if (jumpsRemaining < 1) return null;
  return jumpsRemaining === 2 ? baseJumpForce : baseJumpForce * 0.86;
}
