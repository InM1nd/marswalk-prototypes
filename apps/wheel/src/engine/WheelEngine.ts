import { Application, Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import type { CampaignConfig, WheelSegment } from '../config/schema';
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

function lighten(hex: string, amount: number): number {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  const n = Number.parseInt(full, 16);
  const r = Math.min(255, ((n >> 16) & 255) + Math.round(255 * amount));
  const g = Math.min(255, ((n >> 8) & 255) + Math.round(255 * amount));
  const b = Math.min(255, (n & 255) + Math.round(255 * amount));
  return (r << 16) | (g << 8) | b;
}

export class WheelEngine {
  private app: Application | null = null;
  private wheelContainer: Container | null = null;
  private pointer: Container | null = null;
  private spinning = false;
  // React StrictMode double-invokes effects in dev: mount() can still be
  // in-flight when destroy() fires from the first cleanup. Guards against
  // the resolved init() appending a canvas for an already-destroyed engine.
  private destroyed = false;
  private options: WheelEngineOptions;
  private logoTextureUrl: string | null = null;

  constructor(options: WheelEngineOptions) {
    this.options = options;
  }

  async mount(): Promise<void> {
    const { container, config } = this.options;
    const fontFamily = config.branding.fontFamily ?? 'system-ui, sans-serif';
    try {
      await document.fonts.load(`700 16px ${fontFamily.split(',')[0].trim()}`);
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

    this.options.onReady?.();
  }

  private async preloadLogo(): Promise<void> {
    const url = this.options.config.branding.logoUrl;
    if (!url || url === this.logoTextureUrl) return;
    try {
      await Assets.load(url);
      this.logoTextureUrl = url;
    } catch {
      this.logoTextureUrl = null;
    }
  }

  private async buildAsync(): Promise<void> {
    await this.preloadLogo();
    if (!this.destroyed) this.build();
  }

  /** Rebuilds the whole scene at the current canvas size, preserving rotation. */
  private build(): void {
    const app = this.app;
    if (!app) return;

    const previousRotation = this.wheelContainer?.rotation ?? 0;
    app.stage.removeChildren();

    const { width, height } = app.screen;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 16;
    if (radius <= 0) return;

    const shadow = new Graphics()
      .ellipse(0, radius * 0.08, radius * 0.92, radius * 0.18)
      .fill({ color: 0x000000, alpha: 0.35 });
    shadow.x = cx;
    shadow.y = cy + radius * 0.85;
    app.stage.addChild(shadow);

    const wheelContainer = this.drawWheel(radius);
    wheelContainer.x = cx;
    wheelContainer.y = cy;
    wheelContainer.rotation = previousRotation;
    app.stage.addChild(wheelContainer);
    this.wheelContainer = wheelContainer;

    const rim = this.drawRim(radius);
    rim.x = cx;
    rim.y = cy;
    app.stage.addChild(rim);

    const hub = this.drawHub(radius);
    hub.x = cx;
    hub.y = cy;
    app.stage.addChild(hub);

    const pointer = this.drawPointer();
    pointer.x = cx;
    pointer.y = cy - radius - 4;
    app.stage.addChild(pointer);
    this.pointer = pointer;
  }

  private drawRim(radius: number): Container {
    const { primaryColor, secondaryColor } = this.options.config.branding;
    const rim = new Container();
    rim.addChild(
      new Graphics().circle(0, 0, radius + 6).stroke({ width: 10, color: lighten(primaryColor, 0.12), alpha: 1 }),
    );
    rim.addChild(
      new Graphics().circle(0, 0, radius + 1).stroke({ width: 2, color: lighten(secondaryColor, 0.35), alpha: 0.65 }),
    );
    return rim;
  }

  private drawWheel(radius: number): Container {
    const { segments } = this.options.config.wheel;
    const fontFamily = this.options.config.branding.fontFamily ?? 'system-ui, sans-serif';
    const wheelContainer = new Container();
    const segmentAngle = TAU / segments.length;
    const fontSize = Math.max(11, radius * 0.055);

    segments.forEach((segment, i) => {
      const startAngle = -Math.PI / 2 + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      const slice = new Graphics();
      slice.moveTo(0, 0).arc(0, 0, radius, startAngle, endAngle).lineTo(0, 0).fill(segment.color);
      wheelContainer.addChild(slice);

      // Radial separator at the start of each segment.
      const sep = new Graphics();
      sep.moveTo(Math.cos(startAngle) * (radius * 0.22), Math.sin(startAngle) * (radius * 0.22));
      sep.lineTo(Math.cos(startAngle) * radius, Math.sin(startAngle) * radius);
      sep.stroke({ width: 2, color: 0xffffff, alpha: 0.22 });
      wheelContainer.addChild(sep);

      const midAngle = startAngle + segmentAngle / 2;
      const label = new Text({
        text: segment.label,
        style: {
          fill: segment.textColor,
          fontSize,
          fontWeight: 'bold',
          align: 'center',
          fontFamily,
        },
      });
      label.anchor.set(0.5);
      label.x = Math.cos(midAngle) * radius * 0.62;
      label.y = Math.sin(midAngle) * radius * 0.62;
      let labelRotation = midAngle + Math.PI / 2;
      const normalized = ((labelRotation % TAU) + TAU) % TAU;
      if (normalized > Math.PI / 2 && normalized < (3 * Math.PI) / 2) labelRotation += Math.PI;
      label.rotation = labelRotation;
      wheelContainer.addChild(label);
    });

    return wheelContainer;
  }

  private drawHub(radius: number): Container {
    const { branding } = this.options.config;
    const hub = new Container();
    const hubR = radius * 0.2;

    hub.addChild(new Graphics().circle(0, 0, hubR + 4).fill({ color: lighten(branding.primaryColor, 0.2), alpha: 0.9 }));
    hub.addChild(new Graphics().circle(0, 0, hubR).fill(branding.secondaryColor));
    hub.addChild(
      new Graphics().circle(0, 0, hubR - 3).stroke({ width: 2, color: lighten(branding.primaryColor, 0.1), alpha: 0.7 }),
    );

    const logoUrl = branding.logoUrl;
    if (logoUrl && this.logoTextureUrl === logoUrl) {
      const sprite = Sprite.from(logoUrl);
      const max = hubR * 1.35;
      const scale = Math.min(max / Math.max(sprite.width, 1), max / Math.max(sprite.height, 1));
      sprite.scale.set(scale);
      sprite.anchor.set(0.5);
      hub.addChild(sprite);
    } else {
      const label = new Text({
        text: branding.centerLabel,
        style: {
          fill: branding.primaryColor,
          fontSize: Math.max(11, hubR * 0.45),
          fontWeight: 'bold',
          fontFamily: branding.fontFamily ?? 'system-ui, sans-serif',
        },
      });
      label.anchor.set(0.5);
      hub.addChild(label);
    }

    return hub;
  }

  private drawPointer(): Container {
    const color = this.options.config.branding.primaryColor;
    const pointer = new Container();
    const shadow = new Graphics()
      .moveTo(-12, -2)
      .lineTo(12, -2)
      .lineTo(0, 22)
      .lineTo(-12, -2)
      .fill({ color: 0x000000, alpha: 0.35 });
    shadow.y = 2;
    const tip = new Graphics()
      .moveTo(-14, -4)
      .lineTo(14, -4)
      .lineTo(0, 20)
      .lineTo(-14, -4)
      .fill(color);
    pointer.addChild(shadow, tip);
    return pointer;
  }

  private bouncePointer(): void {
    if (!this.pointer) return;
    const baseY = this.pointer.y;
    gsap.fromTo(
      this.pointer,
      { y: baseY },
      { y: baseY - 6, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' },
    );
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
    this.options.onSpinStart?.();

    const rotationDeg = computeTargetRotation(targetSegmentIndex, segments.length, minFullSpins);
    const targetWithinCircleRad = (((rotationDeg % 360) * Math.PI) / 180 + TAU) % TAU;

    const currentMod = ((wheelContainer.rotation % TAU) + TAU) % TAU;
    const forwardDelta = ((targetWithinCircleRad - currentMod) + TAU * 2) % TAU;
    const finalRotation = currentMod + minFullSpins * TAU + forwardDelta;

    let lastSeg = -1;
    const segCount = segments.length;

    gsap.set(wheelContainer, { rotation: currentMod });
    gsap.to(wheelContainer, {
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
          this.options.onSegmentTick?.(idx);
        }
      },
      onComplete: () => {
        this.spinning = false;
        this.bouncePointer();
        this.options.onSpinEnd?.(segments[targetSegmentIndex]);
      },
    });
  }

  destroy(): void {
    this.destroyed = true;
    gsap.killTweensOf(this.wheelContainer);
    gsap.killTweensOf(this.pointer);
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.wheelContainer = null;
    this.pointer = null;
  }
}
