import { Application, Container, Graphics, Sprite, Text, TilingSprite, type Texture } from 'pixi.js';
import type { CatchConfig } from '../config/schema';
import { comboMultiplier, useGameStore } from '../store/gameStore';
import * as art from './art';
import { FIELD_W, isBad, planDrop, spawnIntervalMs, type DropKind, type PlannedDrop } from './drops';
import { sfx } from './sound';

export interface CatchEngineOptions {
  container: HTMLElement;
  config: CatchConfig;
  onReady?: () => void;
}

/**
 * Logical camera: the playfield is always FIELD_W (360) units wide, centred on wider
 * screens, so difficulty doesn't depend on the device. The stage is scaled to fit.
 */
const MIN_VIEW_H = 560;
const MOUTH_LINE = 0.8;
const SPAWN_Y = -40;
const BAG_MIN_X = art.BAG_HALF_W - 2;
const BAG_MAX_X = FIELD_W - art.BAG_HALF_W + 2;
/** Horizontal reach of the bag's mouth (half-width minus the rim, plus part of a drop). */
const CATCH_RADIUS = 40;
/** Touch drags move the bag by the finger's delta, slightly amplified so a thumb covers the field. */
const DRAG_GAIN = 1.25;
const KEY_SPEED = 420;
const POINTS: Record<DropKind, number> = { burger: 10, pizza: 10, donut: 10, coin: 30, clock: -15 };
const ATTRACT_EVERY_MS = 650;

interface Drop {
  plan: PlannedDrop;
  y: number;
  view: Container;
  spin: number;
  /** Caught: x offset from the bag centre while the drop sinks in behind the front wall. */
  sink?: { dx: number };
}

interface Fx {
  view: Container;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  grow: boolean;
}

type TextureKey = DropKind | 'bagBack' | 'bagFront' | 'glow' | 'redGlow' | 'sky' | 'horizon' | 'stars' | 'far' | 'mid' | 'roof';

export class CatchEngine {
  private app: Application | null = null;
  private destroyed = false;
  private options: CatchEngineOptions;
  private textures: Texture[] = [];
  private tex!: Record<TextureKey, Texture>;

  private view = { w: FIELD_W, h: 640, mouthY: 512, scale: 1 };
  private sky!: Sprite;
  private horizon!: Sprite;
  private starfield!: TilingSprite;
  private far!: TilingSprite;
  private mid!: TilingSprite;
  private roof!: TilingSprite;
  private field = new Container();
  private dropLayer = new Container();
  private fxLayer = new Container();
  // Back wall sits behind the drop layer, front wall in front of it: drops visibly fall in.
  private bagBack = new Container();
  private bagFront = new Container();
  private flashGfx = new Graphics();

  private drops: Drop[] = [];
  private fx: Fx[] = [];
  private bagX = FIELD_W / 2;
  /** Where input wants the bag; the sprite eases towards it. Public for the dev bot. */
  bagTarget = FIELD_W / 2;
  private bagScale = { x: 1, y: 1 };
  private tilt = 0;
  private keys = { left: false, right: false };
  private dragX: number | null = null;

  private elapsed = 0;
  private spawnTimer = 0;
  private clock = 0;
  private shake = 0;
  private flash = 0;

  constructor(options: CatchEngineOptions) {
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

    this.buildScene();
    app.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    window.addEventListener('blur', this.onBlur);

    app.ticker.add(this.tick);
    app.renderer.on('resize', () => this.onResize());
    this.onResize();

    if (import.meta.env.DEV) (window as unknown as { __catch?: CatchEngine }).__catch = this;
    this.options.onReady?.();
  }

  private async loadArt(): Promise<void> {
    const b = { primary: this.options.config.branding.primaryColor, secondary: this.options.config.branding.secondaryColor };
    // Raster at the device scale so sprites stay crisp on retina; capped to bound GPU memory.
    const res = Math.min(3, Math.max(1.5, window.devicePixelRatio * 1.25));
    const entries: Record<TextureKey, [art.Art, number, boolean]> = {
      burger: [art.burger(), res, false],
      pizza: [art.pizza(), res, false],
      donut: [art.donut(b), res, false],
      coin: [art.coin(b), res, false],
      clock: [art.clock(), res, false],
      bagBack: [art.bagBack(b), res, false],
      bagFront: [art.bagFront(b), res, false],
      glow: [art.glow(b.secondary), 1, false],
      redGlow: [art.glow('#ff3b3b'), 1, false],
      sky: [art.sky(b), 1, false],
      horizon: [art.horizonGlow(b), 1, false],
      stars: [art.stars(), res, true],
      far: [art.farCity(), res, true],
      mid: [art.midCity(b), res, true],
      roof: [art.roof(b), res, true],
    };
    const keys = Object.keys(entries) as TextureKey[];
    const loaded = await Promise.all(keys.map((k) => art.svgTexture(...entries[k])));
    this.textures = loaded;
    this.tex = Object.fromEntries(keys.map((k, i) => [k, loaded[i]])) as Record<TextureKey, Texture>;
  }

  private buildScene(): void {
    const app = this.app!;
    const t = this.tex;
    const { branding } = this.options.config;

    this.sky = new Sprite(t.sky);
    this.starfield = new TilingSprite({ texture: t.stars, width: FIELD_W, height: t.stars.height });
    this.horizon = new Sprite(t.horizon);
    this.horizon.anchor.set(0.5, 1);
    this.far = new TilingSprite({ texture: t.far, width: FIELD_W, height: t.far.height });
    this.mid = new TilingSprite({ texture: t.mid, width: FIELD_W, height: t.mid.height });
    this.roof = new TilingSprite({ texture: t.roof, width: FIELD_W, height: t.roof.height });

    // Bag: origin at the centre of its open mouth.
    const bagArt = art.bagBack({ primary: '#000', secondary: '#000' });
    for (const [layer, tex] of [[this.bagBack, t.bagBack], [this.bagFront, t.bagFront]] as const) {
      const sprite = new Sprite(tex);
      sprite.anchor.set(-bagArt.x / bagArt.w, -bagArt.y / bagArt.h);
      layer.addChild(sprite);
    }
    const label = new Text({
      text: branding.brandName,
      style: { fontFamily: `"${branding.fontFamily}", system-ui, sans-serif`, fontWeight: '800', fontSize: 17, fill: '#ffffff', letterSpacing: 1 },
      resolution: Math.min(window.devicePixelRatio, 2) * 2,
    });
    label.anchor.set(0.5);
    label.position.set(0, 40);
    this.bagFront.addChild(label);

    this.field.addChild(this.bagBack, this.dropLayer, this.bagFront, this.fxLayer);
    this.flashGfx.alpha = 0;
    app.stage.addChild(this.sky, this.starfield, this.horizon, this.far, this.mid, this.roof, this.field, this.flashGfx);
  }

  private onResize(): void {
    const app = this.app;
    if (!app || app.screen.width === 0) return;
    const scale = Math.min(app.screen.width / FIELD_W, app.screen.height / MIN_VIEW_H);
    const w = app.screen.width / scale;
    const h = app.screen.height / scale;
    const mouthY = Math.round(h * MOUTH_LINE);
    this.view = { w, h, mouthY, scale };
    app.stage.scale.set(scale);

    const roofY = mouthY + art.BAG_DEPTH - 2;
    this.sky.setSize(w, roofY);
    this.starfield.width = w;
    this.horizon.position.set(w / 2, roofY);
    this.horizon.setSize(w * 1.6, 320);
    for (const strip of [this.far, this.mid, this.roof]) strip.width = w;
    this.far.y = roofY - this.far.height + 30;
    this.mid.y = roofY - this.mid.height + 10;
    this.roof.y = roofY;
    this.roof.height = h - roofY + 10;

    this.field.x = (w - FIELD_W) / 2;
    this.flashGfx.clear().rect(0, 0, w, h).fill(0xffffff);
  }

  /* ---------- Input ---------- */

  private toFieldX(clientX: number): number {
    const rect = this.app!.canvas.getBoundingClientRect();
    return (clientX - rect.left) / this.view.scale - this.field.x;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') this.bagTarget = this.toFieldX(e.clientX);
    else this.dragX = e.clientX;
  };

  private onPointerMove = (e: PointerEvent): void => {
    // Mouse: the bag follows the cursor. Touch: relative drag, so the thumb never hides the bag.
    if (e.pointerType === 'mouse') {
      const rect = this.app?.canvas.getBoundingClientRect();
      if (rect && e.clientY >= rect.top && e.clientY <= rect.bottom) this.bagTarget = this.toFieldX(e.clientX);
      return;
    }
    if (this.dragX === null) return;
    this.bagTarget += ((e.clientX - this.dragX) / this.view.scale) * DRAG_GAIN;
    this.dragX = e.clientX;
  };

  private onPointerUp = (): void => {
    this.dragX = null;
  };

  private onBlur = (): void => {
    this.keys = { left: false, right: false };
    this.dragX = null;
  };

  private onKey = (e: KeyboardEvent): void => {
    const down = e.type === 'keydown';
    // Only steal keys mid-round, or the lead form's email field can't take "a"/"d"/arrows.
    if (down && useGameStore.getState().status !== 'playing') return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = down;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = down;
    else return;
    e.preventDefault();
  };

  /* ---------- Round ---------- */

  start(): void {
    const { round } = this.options.config;
    this.elapsed = 0;
    this.spawnTimer = 350;
    this.shake = 0;
    this.flash = 0;
    for (const d of this.drops) d.view.destroy();
    this.drops = [];
    this.bagTarget = FIELD_W / 2;
    useGameStore.getState().reset(round.durationSeconds);
    useGameStore.getState().setStatus('playing');
  }

  private spawn(scored: boolean): void {
    const { drop, round } = this.options.config;
    const progress = this.elapsed / round.durationSeconds;
    const plan = scored
      ? planDrop(drop, this.elapsed, progress, this.view.mouthY - SPAWN_Y, this.drops.slice(-8).map((d) => d.plan))
      : { ...planDrop(drop, 0, 0, 1, []), arrival: -1 };

    const view = new Container();
    if (plan.kind === 'coin' || plan.kind === 'clock') {
      const halo = new Sprite(plan.kind === 'coin' ? this.tex.glow : this.tex.redGlow);
      halo.anchor.set(0.5);
      halo.blendMode = 'add';
      halo.scale.set(plan.kind === 'coin' ? 1.1 : 0.95);
      view.addChild(halo);
    }
    const face = new Sprite(this.tex[plan.kind]);
    face.anchor.set(0.5);
    view.addChild(face);
    view.position.set(plan.x, SPAWN_Y);
    view.rotation = (Math.random() - 0.5) * 0.6;
    this.dropLayer.addChild(view);
    this.drops.push({ plan, y: SPAWN_Y, view, spin: (Math.random() - 0.5) * 2.4 });
  }

  private onCatch(d: Drop): void {
    const store = useGameStore.getState();
    const { branding } = this.options.config;
    const y = this.view.mouthY - 6;
    if (isBad(d.plan.kind)) {
      store.addScore(-Math.min(store.score, -POINTS.clock));
      store.resetCombo();
      this.shake = 10;
      this.flash = 0.35;
      this.flashGfx.tint = 0xff3b3b;
      this.bagScale = { x: 0.86, y: 1.12 };
      if (!store.muted) sfx.bad();
      this.spawnFloat(d.plan.x, y - 30, `LATE! ${POINTS.clock}`, '#ff6b6b');
      this.burst(d.plan.x, y, 0xff3b3b, 8);
      return;
    }

    const combo = store.bumpCombo();
    const mult = comboMultiplier(combo);
    const points = POINTS[d.plan.kind] * mult;
    store.addScore(points);
    this.bagScale = { x: 1.14, y: 0.86 };
    if (!store.muted) (d.plan.kind === 'coin' ? sfx.golden : sfx.catch)(combo);
    this.spawnFloat(d.plan.x, y - 30, mult > 1 ? `+${points} ×${mult}` : `+${points}`, branding.secondaryColor, d.plan.kind === 'coin' ? 26 : 20);
    this.burst(d.plan.x, y, d.plan.kind === 'coin' ? 0xffffff : branding.secondaryColor, d.plan.kind === 'coin' ? 12 : 6);
    this.checkPrize();
  }

  private checkPrize(): void {
    const store = useGameStore.getState();
    if (store.prizeUnlocked || store.score < this.options.config.prize.threshold) return;
    store.unlockPrize();
    this.flash = 0.25;
    this.flashGfx.tint = 0xffffff;
    if (!store.muted) sfx.prize();
    this.spawnFloat(FIELD_W / 2, this.view.mouthY * 0.45, 'PRIZE UNLOCKED!', this.options.config.branding.secondaryColor, 30, 1.6);
  }

  private spawnFloat(x: number, y: number, label: string, color: string, size = 20, life = 0.8): void {
    const { branding } = this.options.config;
    const view = new Text({
      text: label,
      style: {
        fontFamily: `"${branding.fontFamily}", system-ui, sans-serif`,
        fontSize: size,
        fontWeight: '800',
        fill: color,
        stroke: { color: '#14070a', width: 4, join: 'round' },
        dropShadow: { color: branding.primaryColor, alpha: 0.8, blur: 8, distance: 0 },
      },
      resolution: Math.min(window.devicePixelRatio, 2) * 1.5,
    });
    view.anchor.set(0.5);
    view.position.set(Math.min(FIELD_W - 70, Math.max(70, x)), y);
    this.fxLayer.addChild(view);
    this.fx.push({ view, life, maxLife: life, vx: 0, vy: -46, grow: true });
  }

  private burst(x: number, y: number, color: string | number, count: number): void {
    for (let i = 0; i < count; i++) {
      const s = new Sprite(this.tex.glow);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.tint = color;
      s.scale.set(0.18 + Math.random() * 0.14);
      s.position.set(x + (Math.random() - 0.5) * 30, y);
      this.fxLayer.addChild(s);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = 90 + Math.random() * 120;
      this.fx.push({ view: s, life: 0.5, maxLife: 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, grow: false });
    }
  }

  /* ---------- Loop ---------- */

  private tick = (): void => {
    const app = this.app;
    if (!app) return;
    const dt = Math.min(app.ticker.deltaMS, 1000 / 30) / 1000;
    this.clock += dt;
    const playing = useGameStore.getState().status === 'playing';

    if (playing) {
      this.elapsed += dt;
      const { drop, round } = this.options.config;
      this.spawnTimer -= dt * 1000;
      if (this.spawnTimer <= 0) {
        this.spawn(true);
        this.spawnTimer += spawnIntervalMs(drop, this.elapsed / round.durationSeconds);
      }
    } else {
      // Idle / result: a slow decorative drizzle behind the overlay.
      this.spawnTimer -= dt * 1000;
      if (this.spawnTimer <= 0) {
        this.spawn(false);
        this.spawnTimer = ATTRACT_EVERY_MS;
      }
    }

    this.moveBag(dt);
    this.moveDrops(dt, playing);
    this.updateJuice(dt);

    if (playing) {
      useGameStore.getState().tickTime(dt);
      if (useGameStore.getState().timeLeft <= 0) {
        this.flash = 0.25;
        this.flashGfx.tint = 0xffffff;
        this.spawnTimer = ATTRACT_EVERY_MS;
        useGameStore.getState().setStatus('gameover');
      }
    }
  };

  private moveBag(dt: number): void {
    const dir = Number(this.keys.right) - Number(this.keys.left);
    if (dir) this.bagTarget += dir * KEY_SPEED * dt;
    this.bagTarget = Math.min(BAG_MAX_X, Math.max(BAG_MIN_X, this.bagTarget));
    const prev = this.bagX;
    this.bagX += (this.bagTarget - this.bagX) * Math.min(1, dt * 22);
    const v = (this.bagX - prev) / Math.max(dt, 0.001);
    this.tilt += (Math.max(-0.22, Math.min(0.22, v * 0.0007)) - this.tilt) * Math.min(1, dt * 10);
  }

  private moveDrops(dt: number, playing: boolean): void {
    const mouth = this.view.mouthY;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (d.sink) {
        // Slide to the bag's centre and drop below the front wall's rim, then vanish inside.
        d.y += d.plan.speed * 0.6 * dt;
        d.sink.dx *= 1 - Math.min(1, dt * 10);
        d.view.position.set(this.bagX + d.sink.dx, d.y);
        d.view.scale.set(Math.max(0.6, d.view.scale.x - dt * 1.5));
        if (d.y > mouth + 34) this.removeDrop(i);
        continue;
      }
      const prevY = d.y;
      d.y += d.plan.speed * dt;
      d.view.y = d.y;
      if (d.plan.kind === 'clock') d.view.rotation = Math.sin(this.clock * 26) * 0.12;
      else if (d.plan.kind === 'coin') d.view.children[1].scale.x = 0.5 + 0.5 * Math.abs(Math.cos(this.clock * 4 + d.plan.x));
      else d.view.rotation += d.spin * dt;

      const scored = playing && d.plan.arrival >= 0;
      if (scored && prevY < mouth && d.y >= mouth && Math.abs(d.plan.x - this.bagX) <= CATCH_RADIUS) {
        this.onCatch(d);
        if (isBad(d.plan.kind)) this.removeDrop(i);
        else d.sink = { dx: d.plan.x - this.bagX };
        continue;
      }
      if (scored && prevY < mouth && d.y >= mouth && !isBad(d.plan.kind) && useGameStore.getState().combo > 0) {
        useGameStore.getState().resetCombo();
        if (!useGameStore.getState().muted) sfx.miss();
      }
      if (d.y > this.view.h + 40) this.removeDrop(i);
    }
  }

  private removeDrop(i: number): void {
    this.drops[i].view.destroy();
    this.drops.splice(i, 1);
  }

  private updateJuice(dt: number): void {
    this.bagScale.x += (1 - this.bagScale.x) * Math.min(1, dt * 12);
    this.bagScale.y += (1 - this.bagScale.y) * Math.min(1, dt * 12);
    // Idle bob so the bag reads as "alive" behind the start card.
    const bob = useGameStore.getState().status === 'playing' ? 0 : Math.sin(this.clock * 2.4) * 2;
    for (const layer of [this.bagBack, this.bagFront]) {
      layer.position.set(this.bagX, this.view.mouthY + bob);
      layer.rotation = this.tilt;
      layer.scale.set(this.bagScale.x, this.bagScale.y);
    }

    const ox = (this.view.w - FIELD_W) / 2;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 40);
      this.field.x = ox + (Math.random() - 0.5) * this.shake;
      this.field.y = (Math.random() - 0.5) * this.shake;
    } else {
      this.field.x = ox;
      this.field.y = 0;
    }
    this.far.tilePosition.x = -this.clock * 3;
    this.mid.tilePosition.x = -this.clock * 7;

    this.flashGfx.alpha = Math.max(0, this.flash);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.8);

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.life -= dt;
      f.view.x += f.vx * dt;
      f.view.y += f.vy * dt;
      const age = 1 - f.life / f.maxLife;
      f.view.alpha = Math.min(1, f.life / (f.maxLife * 0.4));
      if (f.grow) f.view.scale.set(age < 0.15 ? 0.6 + age * 3 : 1.05 + age * 0.15);
      else f.vy += 380 * dt;
      if (f.life <= 0) {
        f.view.destroy();
        this.fx.splice(i, 1);
      }
    }
  }

  /** Dev-only probe for tuning bots (see window.__catch). */
  debugState() {
    return {
      bagX: this.bagX,
      view: this.view,
      fps: this.app?.ticker.FPS,
      drops: this.drops.map((d) => ({ kind: d.plan.kind, x: d.plan.x, y: d.y, arrival: d.plan.arrival })),
    };
  }

  destroy(): void {
    this.destroyed = true;
    this.app?.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    window.removeEventListener('blur', this.onBlur);
    this.app?.destroy(true, { children: true });
    for (const t of this.textures) t.destroy(true);
    this.textures = [];
    this.drops = [];
    this.fx = [];
    this.app = null;
  }
}
