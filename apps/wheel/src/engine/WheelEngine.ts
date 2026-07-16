import { Application, Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import type { CampaignConfig, WheelSegment } from '../config/schema';
import { computeTargetRotation } from './geometry';

export interface WheelEngineOptions {
  container: HTMLElement;
  config: CampaignConfig;
  onSpinStart?: () => void;
  onSpinEnd?: (segment: WheelSegment) => void;
  onReady?: () => void;
}

const TAU = Math.PI * 2;

export class WheelEngine {
  private app: Application | null = null;
  private wheelContainer: Container | null = null;
  private spinning = false;
  // React StrictMode double-invokes effects in dev: mount() can still be
  // in-flight when destroy() fires from the first cleanup. Guards against
  // the resolved init() appending a canvas for an already-destroyed engine.
  private destroyed = false;
  private options: WheelEngineOptions;

  constructor(options: WheelEngineOptions) {
    this.options = options;
  }

  async mount(): Promise<void> {
    const { container } = this.options;
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

    this.build();
    app.renderer.on('resize', () => this.build());

    this.options.onReady?.();
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
    const radius = Math.min(width, height) / 2 - 8;
    if (radius <= 0) return; // container not laid out yet

    const wheelContainer = this.drawWheel(radius);
    wheelContainer.x = cx;
    wheelContainer.y = cy;
    wheelContainer.rotation = previousRotation;
    app.stage.addChild(wheelContainer);
    this.wheelContainer = wheelContainer;

    const hub = this.drawHub(radius);
    hub.x = cx;
    hub.y = cy;
    app.stage.addChild(hub);

    const pointer = this.drawPointer();
    pointer.x = cx;
    pointer.y = cy - radius - 6;
    app.stage.addChild(pointer);
  }

  private drawWheel(radius: number): Container {
    const { segments } = this.options.config.wheel;
    const wheelContainer = new Container();
    const segmentAngle = TAU / segments.length;

    segments.forEach((segment, i) => {
      const startAngle = -Math.PI / 2 + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      const slice = new Graphics();
      slice.moveTo(0, 0).arc(0, 0, radius, startAngle, endAngle).lineTo(0, 0).fill(segment.color);
      wheelContainer.addChild(slice);

      const midAngle = startAngle + segmentAngle / 2;
      const label = new Text({
        text: segment.label,
        style: { fill: segment.textColor, fontSize: 15, fontWeight: 'bold', align: 'center' },
      });
      label.anchor.set(0.5);
      label.x = Math.cos(midAngle) * radius * 0.62;
      label.y = Math.sin(midAngle) * radius * 0.62;
      let labelRotation = midAngle + Math.PI / 2;
      // flip 180° on the lower half so text reads upright, not mirrored
      const normalized = ((labelRotation % TAU) + TAU) % TAU;
      if (normalized > Math.PI / 2 && normalized < (3 * Math.PI) / 2) labelRotation += Math.PI;
      label.rotation = labelRotation;
      wheelContainer.addChild(label);
    });

    return wheelContainer;
  }

  private drawHub(radius: number): Container {
    const hub = new Container();
    const circle = new Graphics().circle(0, 0, radius * 0.2).fill(this.options.config.branding.secondaryColor);
    const label = new Text({
      text: this.options.config.branding.centerLabel,
      style: { fill: this.options.config.branding.primaryColor, fontSize: 14, fontWeight: 'bold' },
    });
    label.anchor.set(0.5);
    hub.addChild(circle, label);
    return hub;
  }

  private drawPointer(): Graphics {
    return new Graphics()
      .moveTo(-14, -4)
      .lineTo(14, -4)
      .lineTo(0, 20)
      .lineTo(-14, -4)
      .fill(this.options.config.branding.primaryColor);
  }

  /** Swaps in a new config and redraws immediately — e.g. from a live config-editing panel. */
  updateConfig(config: CampaignConfig): void {
    if (this.spinning) return; // rebuilding mid-animation would orphan the in-flight gsap tween
    this.options.config = config;
    this.build();
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

    gsap.set(wheelContainer, { rotation: currentMod });
    gsap.to(wheelContainer, {
      rotation: finalRotation,
      duration: spinDurationMs / 1000,
      ease: 'power4.out',
      onComplete: () => {
        this.spinning = false;
        this.options.onSpinEnd?.(segments[targetSegmentIndex]);
      },
    });
  }

  destroy(): void {
    this.destroyed = true;
    gsap.killTweensOf(this.wheelContainer);
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.wheelContainer = null;
  }
}
