import { Application, Assets, Container, FillGradient, Graphics, Sprite, Text, type Ticker } from 'pixi.js';
import gsap from 'gsap';
import type { CampaignConfig, WheelSegment } from '../config/schema';
import { onColor, shade } from '../lib/color';
import { computeTargetRotation } from './geometry';

export interface WheelEngineOptions {
  container: HTMLElement;
  config: CampaignConfig;
  onSpinStart?: () => void;
  onSpinEnd?: (segment: WheelSegment) => void;
  onReady?: () => void;
  /** Fires when the wheel rotation crosses into a new segment (for tick SFX). */
  onSegmentTick?: (segmentIndex: number) => void;
}

const TAU = Math.PI * 2;
const IDLE_SPEED = 0.05; // rad/s — slow "alive" drift while waiting for a spin
const LANDING_HOLD_MS = 900; // winner highlight is visible before the result modal covers it
const BULB_COUNT = 24;

function radial(stops: Array<[number, number, number?]>, outerRadius: number, innerRadius = 0): FillGradient {
  return new FillGradient({
    type: 'radial',
    center: { x: 0, y: 0 },
    innerRadius,
    outerCenter: { x: 0, y: 0 },
    outerRadius,
    textureSpace: 'global',
    colorStops: stops.map(([offset, color, alpha = 1]) => ({
      offset,
      color: `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`,
    })),
  });
}

function vertical(stops: Array<[number, number, number?]>, top: number, bottom: number): FillGradient {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: top },
    end: { x: 0, y: bottom },
    textureSpace: 'global',
    colorStops: stops.map(([offset, color, alpha = 1]) => ({
      offset,
      color: `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`,
    })),
  });
}

export class WheelEngine {
  private app: Application | null = null;
  private wheelContainer: Container | null = null;
  private pointer: Container | null = null;
  private bulbs: Graphics[] = [];
  private highlight: Graphics | null = null;
  // Each FillGradient owns a canvas texture that Graphics.destroy() doesn't free.
  private gradients: FillGradient[] = [];
  private radius = 0;
  private spinning = false;
  private landingTimer: number | null = null;
  private chaseClock = 0;
  private chaseSpeed = 1;
  private celebrateUntil = 0;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // React StrictMode double-invokes effects in dev: mount() can still be
  // in-flight when destroy() fires from the first cleanup. Guards against
  // the resolved init() appending a canvas for an already-destroyed engine.
  private destroyed = false;
  private options: WheelEngineOptions;
  private logoTextureUrl: string | null = null;

  constructor(options: WheelEngineOptions) {
    this.options = options;
  }

  private radial(...args: Parameters<typeof radial>): FillGradient {
    const g = radial(...args);
    this.gradients.push(g);
    return g;
  }

  private vertical(...args: Parameters<typeof vertical>): FillGradient {
    const g = vertical(...args);
    this.gradients.push(g);
    return g;
  }

  private releaseGradients(): void {
    this.gradients.forEach((g) => g.destroy());
    this.gradients = [];
  }

  async mount(): Promise<void> {
    const { container, config } = this.options;
    const fontFamily = config.branding.fontFamily ?? 'system-ui, sans-serif';
    try {
      await document.fonts.load(`800 16px ${fontFamily.split(',')[0].trim()}`);
      await document.fonts.ready;
    } catch {
      // Font Loading API may reject unknown families; Pixi falls back fine.
    }

    const app = new Application();
    await app.init({
      resizeTo: container,
      backgroundAlpha: 0,
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

    await this.preloadLogo();
    this.build();
    app.renderer.on('resize', () => {
      void this.buildAsync();
    });
    app.ticker.add(this.tick);

    this.options.onReady?.();
  }

  private async preloadLogo(): Promise<void> {
    const url = this.options.config.branding.logoUrl;
    if (!url || url === this.logoTextureUrl) return;
    try {
      // Logos are small SVGs; rasterize them big so the hub stays crisp at DPR 2.
      await Assets.load({ src: url, data: { resolution: 6 } });
      this.logoTextureUrl = url;
    } catch {
      this.logoTextureUrl = null;
    }
  }

  private async buildAsync(): Promise<void> {
    await this.preloadLogo();
    if (!this.destroyed) this.build();
  }

  /** Per-frame: idle drift + rim-bulb chase. Never touches the wheel while a spin tween owns it. */
  private tick = (ticker: Ticker): void => {
    const dt = ticker.deltaMS / 1000;
    if (!this.spinning && this.landingTimer === null && this.wheelContainer && !this.reducedMotion) {
      this.wheelContainer.rotation += IDLE_SPEED * dt;
    }
    if (!this.bulbs.length) return;

    this.chaseClock += dt * this.chaseSpeed;
    const celebrating = performance.now() < this.celebrateUntil;
    this.bulbs.forEach((bulb, i) => {
      if (this.reducedMotion) {
        bulb.alpha = i % 2 ? 0.55 : 1;
      } else if (celebrating) {
        bulb.alpha = Math.floor(this.chaseClock * 8) % 2 ? 1 : 0.25;
      } else {
        const phase = (this.chaseClock * 3 - i / 3) % 2;
        bulb.alpha = 0.35 + 0.65 * Math.max(0, Math.cos(phase * Math.PI));
      }
    });
  };

  /** Rebuilds the whole scene at the current canvas size, preserving rotation. */
  private build(): void {
    const app = this.app;
    if (!app) return;

    const previousRotation = this.wheelContainer?.rotation ?? 0;
    if (this.pointer) gsap.killTweensOf(this.pointer);
    if (this.highlight) gsap.killTweensOf(this.highlight);
    // `context: true` matters: without it each Graphics' context stays registered with the
    // renderer and the whole old scene is retained on every rebuild (live config edits, resize).
    app.stage.removeChildren().forEach((child) => child.destroy({ children: true, context: true }));
    this.releaseGradients();
    this.highlight = null;

    const { width, height } = app.screen;
    const size = Math.min(width, height);
    const cx = width / 2;
    const cy = height / 2 + size * 0.025;
    const rimWidth = size * 0.045;
    // Margin leaves room for the halo/drop shadow so they never clip at the canvas edge.
    const radius = size / 2 - rimWidth - size * 0.075;
    if (radius <= 0) return;
    this.radius = radius;

    const at = <T extends Container>(node: T, y = cy): T => {
      node.position.set(cx, y);
      app.stage.addChild(node);
      return node;
    };

    at(this.drawBackGlow(radius, rimWidth));

    const wheelContainer = at(this.drawWheel(radius));
    wheelContainer.rotation = previousRotation;
    this.wheelContainer = wheelContainer;

    at(this.drawFaceShading(radius));
    at(this.drawRim(radius, rimWidth));
    at(this.drawHub(radius));
    this.pointer = at(this.drawPointer(radius), cy - radius - rimWidth * 0.55);
  }

  private drawBackGlow(radius: number, rimWidth: number): Container {
    const { primaryColor } = this.options.config.branding;
    const outer = radius + rimWidth;
    const node = new Container();
    // Drop shadow under the whole wheel, then a soft brand halo around it.
    const shadow = new Graphics()
      .circle(0, 0, outer * 1.08)
      .fill(this.radial([[0.82, 0x000000, 0.55], [1, 0x000000, 0]], outer * 1.08));
    shadow.y = outer * 0.06;
    node.addChild(shadow);
    node.addChild(
      new Graphics()
        .circle(0, 0, outer * 1.12)
        .fill(this.radial([[0.8, shade(primaryColor, 0), 0.32], [1, shade(primaryColor, 0), 0]], outer * 1.12)),
    );
    return node;
  }

  private drawWheel(radius: number): Container {
    const { segments } = this.options.config.wheel;
    const fontFamily = this.options.config.branding.fontFamily ?? 'system-ui, sans-serif';
    const wheelContainer = new Container();
    const segmentAngle = TAU / segments.length;
    const chord = 2 * radius * 0.62 * Math.sin(segmentAngle / 2);
    const fontSize = Math.max(11, Math.min(radius * 0.085, chord * 0.32));
    const maxLabelWidth = radius * 0.58;

    segments.forEach((segment, i) => {
      const startAngle = -Math.PI / 2 + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      wheelContainer.addChild(
        new Graphics()
          .moveTo(0, 0)
          .arc(0, 0, radius, startAngle, endAngle)
          .lineTo(0, 0)
          .fill(
            this.radial(
              [
                [0, shade(segment.color, 0.1)],
                [0.6, shade(segment.color, 0)],
                [1, shade(segment.color, -0.12)],
              ],
              radius,
            ),
          ),
      );

      // Hairline separator: dark groove + light bevel.
      const sx = Math.cos(startAngle);
      const sy = Math.sin(startAngle);
      wheelContainer.addChild(
        new Graphics()
          .moveTo(sx * radius * 0.2, sy * radius * 0.2)
          .lineTo(sx * radius, sy * radius)
          .stroke({ width: 3, color: 0x000000, alpha: 0.28 })
          .moveTo(sx * radius * 0.2, sy * radius * 0.2)
          .lineTo(sx * radius, sy * radius)
          .stroke({ width: 1, color: 0xffffff, alpha: 0.35 }),
      );

      // Labels read from the hub outward, right-aligned near the rim.
      const midAngle = startAngle + segmentAngle / 2;
      const textColor = segment.textColor ?? onColor(segment.color);
      const label = new Text({
        text: segment.label,
        // Rotated text samples its texture off-axis; oversample so edges stay clean.
        resolution: Math.min(window.devicePixelRatio, 2) * 2,
        style: {
          fill: textColor,
          fontSize,
          fontWeight: '800',
          fontFamily,
          letterSpacing: fontSize * 0.02,
          dropShadow:
            textColor === '#ffffff' ? { color: 0x000000, alpha: 0.35, blur: 3, distance: 1, angle: Math.PI / 2 } : undefined,
        },
      });
      if (label.width > maxLabelWidth) label.scale.set(maxLabelWidth / label.width);
      label.anchor.set(1, 0.5);
      label.position.set(Math.cos(midAngle) * radius * 0.88, Math.sin(midAngle) * radius * 0.88);
      label.rotation = midAngle;
      wheelContainer.addChild(label);
    });

    // Pegs on the segment boundaries — they also "catch" the pointer visually.
    segments.forEach((_, i) => {
      const a = -Math.PI / 2 + i * segmentAngle;
      const r = radius * 0.955;
      const peg = new Graphics()
        .circle(0, 1, radius * 0.022)
        .fill({ color: 0x000000, alpha: 0.4 })
        .circle(0, 0, radius * 0.02)
        .fill(this.radial([[0, 0xffffff], [0.6, 0xe6e6ee], [1, 0x8a8a96]], radius * 0.02));
      peg.position.set(Math.cos(a) * r, Math.sin(a) * r);
      wheelContainer.addChild(peg);
    });

    return wheelContainer;
  }

  /** Static (non-rotating) lighting over the wheel face: inner vignette + top gloss. */
  private drawFaceShading(radius: number): Container {
    const node = new Container();
    // Edge vignette as stacked hairlines. (A radial gradient can't do it: Pixi pre-fills the
    // gradient texture with the LAST stop color, which would darken the whole face.)
    const vignette = new Graphics();
    for (let k = 0; k < 8; k++) {
      vignette.circle(0, 0, radius - k * 2 - 1).stroke({ width: 2, color: 0x000000, alpha: 0.05 * (8 - k) * 0.5 });
    }
    node.addChild(vignette);
    node.addChild(
      new Graphics()
        .circle(0, 0, radius)
        .fill(this.vertical([[0, 0xffffff, 0.16], [0.5, 0xffffff, 0]], -radius, radius)),
    );
    return node;
  }

  private drawRim(radius: number, rimWidth: number): Container {
    const { primaryColor } = this.options.config.branding;
    const rim = new Container();
    const mid = radius + rimWidth / 2;
    const outer = radius + rimWidth;

    // Metallic band: brand color lit from above.
    rim.addChild(
      new Graphics()
        .circle(0, 0, mid)
        .stroke({
          width: rimWidth,
          fill: this.vertical(
            [
              [0, shade(primaryColor, 0.55)],
              [0.45, shade(primaryColor, 0.05)],
              [1, shade(primaryColor, -0.45)],
            ],
            -outer,
            outer,
          ),
        }),
    );
    rim.addChild(new Graphics().circle(0, 0, outer).stroke({ width: 1.5, color: 0xffffff, alpha: 0.35 }));
    rim.addChild(new Graphics().circle(0, 0, radius).stroke({ width: 3, color: 0x000000, alpha: 0.45 }));
    rim.addChild(new Graphics().circle(0, 0, radius - 1.5).stroke({ width: 1, color: 0xffffff, alpha: 0.18 }));

    this.bulbs = [];
    const bulbR = Math.max(2.5, rimWidth * 0.2);
    for (let i = 0; i < BULB_COUNT; i++) {
      const a = (i / BULB_COUNT) * TAU - Math.PI / 2 + TAU / BULB_COUNT / 2;
      const x = Math.cos(a) * mid;
      const y = Math.sin(a) * mid;
      rim.addChild(new Graphics().circle(x, y, bulbR * 1.1).fill({ color: 0x000000, alpha: 0.35 }));
      // Gradients are in the shape's local space: draw at the origin, then move.
      const bulb = new Graphics()
        .circle(0, 0, bulbR * 2.4)
        .fill(this.radial([[0, 0xfff4d6, 0.55], [1, 0xfff4d6, 0]], bulbR * 2.4))
        .circle(0, 0, bulbR)
        .fill(0xfffaf0);
      bulb.position.set(x, y);
      rim.addChild(bulb);
      this.bulbs.push(bulb);
    }
    return rim;
  }

  private drawHub(radius: number): Container {
    const { branding } = this.options.config;
    const hub = new Container();
    const hubR = radius * 0.22;

    hub.addChild(new Graphics().circle(0, hubR * 0.08, hubR * 1.12).fill({ color: 0x000000, alpha: 0.45 }));
    hub.addChild(
      new Graphics().circle(0, 0, hubR * 1.08).fill(
        this.vertical(
          [
            [0, shade(branding.primaryColor, 0.6)],
            [0.5, shade(branding.primaryColor, 0)],
            [1, shade(branding.primaryColor, -0.5)],
          ],
          -hubR * 1.08,
          hubR * 1.08,
        ),
      ),
    );
    hub.addChild(
      new Graphics()
        .circle(0, 0, hubR * 0.92)
        .fill(this.radial([[0, shade(branding.secondaryColor, 0.14)], [1, shade(branding.secondaryColor, -0.2)]], hubR)),
    );
    hub.addChild(
      new Graphics()
        .ellipse(0, -hubR * 0.45, hubR * 0.7, hubR * 0.38)
        .fill(this.vertical([[0, 0xffffff, 0.18], [1, 0xffffff, 0]], -hubR * 0.83, -hubR * 0.07)),
    );

    const logoUrl = branding.logoUrl;
    if (logoUrl && this.logoTextureUrl === logoUrl) {
      const sprite = Sprite.from(logoUrl);
      const max = hubR * 1.25;
      sprite.scale.set(Math.min(max / Math.max(sprite.width, 1), max / Math.max(sprite.height, 1)));
      sprite.anchor.set(0.5);
      hub.addChild(sprite);
    } else {
      const label = new Text({
        text: branding.centerLabel,
        style: {
          fill: branding.primaryColor,
          fontSize: Math.max(11, hubR * 0.5),
          fontWeight: '800',
          fontFamily: branding.fontFamily ?? 'system-ui, sans-serif',
        },
      });
      label.anchor.set(0.5);
      hub.addChild(label);
    }

    return hub;
  }

  /** Teardrop flapper pinned at its top; rotates on pegs during a spin. */
  private drawPointer(radius: number): Container {
    const color = this.options.config.branding.primaryColor;
    const w = radius * 0.13;
    const h = radius * 0.2;
    const shape = (g: Graphics) =>
      g
        .moveTo(0, h)
        .bezierCurveTo(-w * 0.35, h * 0.55, -w, h * 0.1, -w, -h * 0.12)
        .arc(0, -h * 0.12, w, Math.PI, 0)
        .bezierCurveTo(w, h * 0.1, w * 0.35, h * 0.55, 0, h);

    const pointer = new Container();
    const shadow = shape(new Graphics()).fill({ color: 0x000000, alpha: 0.4 });
    shadow.position.set(0, 4);
    const body = shape(new Graphics()).fill(
      this.vertical([[0, shade(color, 0.5)], [0.5, shade(color, 0)], [1, shade(color, -0.35)]], -h * 1.1, h),
    );
    const outline = shape(new Graphics()).stroke({ width: 2, color: 0xffffff, alpha: 0.55 });
    const pin = new Graphics().circle(0, 0, w * 0.32).fill(this.radial([[0, 0xffffff], [1, 0xb8b8c4]], w * 0.32));
    pin.position.set(0, -h * 0.12);
    pointer.addChild(shadow, body, outline, pin);
    pointer.pivot.set(0, -h * 0.12);
    return pointer;
  }

  private kickPointer(): void {
    if (!this.pointer || this.reducedMotion) return;
    gsap.fromTo(this.pointer, { rotation: -0.32 }, { rotation: 0, duration: 0.18, ease: 'back.out(3)', overwrite: true });
  }

  private showWinner(index: number): void {
    const wheel = this.wheelContainer;
    if (!wheel) return;
    const { segments } = this.options.config.wheel;
    const segmentAngle = TAU / segments.length;
    const start = -Math.PI / 2 + index * segmentAngle;
    const radius = this.radius;

    const highlight = new Graphics()
      .moveTo(0, 0)
      .arc(0, 0, radius, start, start + segmentAngle)
      .lineTo(0, 0)
      .fill({ color: 0xffffff, alpha: 1 })
      .moveTo(0, 0)
      .arc(0, 0, radius, start, start + segmentAngle)
      .lineTo(0, 0)
      .stroke({ width: 4, color: 0xffffff, alpha: 1 });
    highlight.alpha = 0;
    highlight.blendMode = 'add';
    // drawWheel adds [slice, separator, label] per segment: sit just above the winner's slice, under its label.
    wheel.addChildAt(highlight, index * 3 + 1);
    this.highlight = highlight;
    // Even repeat count: the pulse ends lit, so the winner stays marked under the modal.
    gsap.to(highlight, { alpha: 0.45, duration: 0.18, yoyo: true, repeat: 6, ease: 'sine.inOut' });
  }

  private clearWinner(): void {
    if (!this.highlight) return;
    gsap.killTweensOf(this.highlight);
    this.highlight.destroy();
    this.highlight = null;
  }

  /** Swaps in a new config and redraws immediately — e.g. from a live config-editing panel. */
  updateConfig(config: CampaignConfig): void {
    if (this.spinning) return;
    this.options.config = config;
    void this.buildAsync();
  }

  spin(targetSegmentIndex: number): void {
    const wheelContainer = this.wheelContainer;
    if (!wheelContainer || this.spinning) return;

    const { segments, minFullSpins, spinDurationMs } = this.options.config.wheel;
    this.spinning = true;
    this.clearWinner();
    this.options.onSpinStart?.();

    const rotationDeg = computeTargetRotation(targetSegmentIndex, segments.length, minFullSpins);
    const targetWithinCircleRad = (((rotationDeg % 360) * Math.PI) / 180 + TAU) % TAU;

    const currentMod = ((wheelContainer.rotation % TAU) + TAU) % TAU;
    const windUp = this.reducedMotion ? 0 : 0.22;
    // Forward distance is measured from the wound-up position so the landing math stays exact.
    const forwardDelta = ((targetWithinCircleRad - (currentMod - windUp)) + TAU * 2) % TAU;
    const finalRotation = currentMod - windUp + minFullSpins * TAU + forwardDelta;

    let lastSeg = -1;
    const segCount = segments.length;

    gsap.set(wheelContainer, { rotation: currentMod });
    const tl = gsap.timeline({
      onComplete: () => {
        this.chaseSpeed = 1;
        this.spinning = false;
        this.celebrateUntil = performance.now() + (segments[targetSegmentIndex].prize.isWin ? 2600 : 0);
        this.showWinner(targetSegmentIndex);
        // Hold the idle drift until the result modal has taken over.
        this.landingTimer = window.setTimeout(() => {
          this.landingTimer = null;
          this.options.onSpinEnd?.(segments[targetSegmentIndex]);
        }, LANDING_HOLD_MS);
      },
    });
    if (windUp) tl.to(wheelContainer, { rotation: currentMod - windUp, duration: 0.32, ease: 'power2.inOut' });
    tl.call(() => {
      this.chaseSpeed = 4;
    });
    tl.to(wheelContainer, {
      rotation: finalRotation,
      duration: spinDurationMs / 1000,
      ease: 'power4.out',
      onUpdate: () => {
        // Pointer is at top (-PI/2). Segment index under pointer:
        const rot = ((wheelContainer.rotation % TAU) + TAU) % TAU;
        const angleFromTop = (rot + Math.PI / 2) % TAU;
        const idx = Math.floor(((TAU - angleFromTop) % TAU) / (TAU / segCount)) % segCount;
        if (idx !== lastSeg) {
          lastSeg = idx;
          this.kickPointer();
          this.options.onSegmentTick?.(idx);
        }
      },
    });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.landingTimer !== null) window.clearTimeout(this.landingTimer);
    gsap.killTweensOf(this.wheelContainer);
    gsap.killTweensOf(this.pointer);
    if (this.highlight) gsap.killTweensOf(this.highlight);
    this.app?.ticker.remove(this.tick);
    this.app?.destroy(true, { children: true });
    this.releaseGradients();
    this.app = null;
    this.wheelContainer = null;
    this.pointer = null;
    this.bulbs = [];
  }
}
