import { Application, Container, Graphics, RenderTexture, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import type { CampaignConfig, PrizeSlot } from '../config/schema';
import { FoilPainter } from './foilCover';
import { Gradients } from './gradients';
import { onColor } from '../lib/color';

export interface ScratchEngineOptions {
  container: HTMLElement;
  config: CampaignConfig;
  onRevealStart?: () => void;
  onRevealEnd?: (segment: PrizeSlot) => void;
  onScratchProgress?: (percent: number) => void;
  onReady?: () => void;
}

const REVEAL_THRESHOLD = 0.55;
const ERASER_RADIUS = 26;
const REVEAL_HOLD_MS = 1100;
const CELL_SIZE = 20;

interface ScratchGrid {
  cols: number;
  rows: number;
  scratched: Set<number>;
}

export class ScratchEngine {
  private app: Application | null = null;
  private destroyed = false;
  private holdTimer: number | null = null;
  private options: ScratchEngineOptions;

  private coverTexture: RenderTexture | null = null;
  private coverSprite: Sprite | null = null;
  private prizeTitle: Text | null = null;
  private sheen: Graphics | null = null;
  private sparkleRoot: Container | null = null;
  private eraserBrush = new Graphics();
  private eraserRoot = new Container();

  private segmentIndex = 0;
  private started = false;
  private revealed = false;
  private grid: ScratchGrid | null = null;
  private lastPoint: { x: number; y: number } | null = null;
  private activePointerId: number | null = null;
  private lastProgressEmit = 0;
  private sheenTween: gsap.core.Tween | null = null;
  private gradients = new Gradients();
  private foil = new FoilPainter();

  constructor(options: ScratchEngineOptions) {
    this.options = options;
    this.eraserRoot.addChild(this.eraserBrush);
  }

  async mount(): Promise<void> {
    const { container, config } = this.options;
    try {
      const family = (config.branding.fontFamily ?? 'system-ui').split(',')[0].trim();
      await document.fonts.load(`800 16px ${family}`);
      await document.fonts.ready;
    } catch {
      // ignore font load failures
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
    app.canvas.style.touchAction = 'none';

    this.build();
    app.renderer.on('resize', () => this.build());
    this.attachPointerEvents();
    this.options.onReady?.();
  }

  updateConfig(config: CampaignConfig): void {
    if (this.revealed || this.started) return;
    this.options.config = config;
    this.build();
  }

  /** Arms the card with a specific (already resolved) prize and resets the cover. */
  reveal(segmentIndex: number): void {
    this.segmentIndex = segmentIndex;
    this.started = false;
    this.revealed = false;
    this.lastPoint = null;
    this.lastProgressEmit = 0;
    this.build();
  }

  private get segment(): PrizeSlot {
    return this.options.config.prizes.segments[this.segmentIndex];
  }

  private build(): void {
    const app = this.app;
    if (!app) return;

    const { width, height } = app.screen;
    if (width <= 0 || height <= 0) return;
    this.grid = {
      cols: Math.ceil(width / CELL_SIZE),
      rows: Math.ceil(height / CELL_SIZE),
      scratched: new Set(),
    };

    this.sheenTween?.kill();
    if (this.prizeTitle) gsap.killTweensOf(this.prizeTitle.scale);
    gsap.killTweensOf(this.coverSprite);
    // `context: true` frees each Graphics' context; without it the renderer keeps old scenes alive.
    app.stage.removeChildren().forEach((child) => child.destroy({ children: true, context: true }));
    this.gradients.release();

    const prize = this.drawPrizeLayer(width, height);
    app.stage.addChild(prize);

    const cover = this.buildCover(width, height);
    app.stage.addChild(cover);

    const sheen = this.buildSheen(width, height);
    this.sheen = sheen;
    app.stage.addChild(sheen);
    this.sheenTween = gsap.to(sheen, {
      x: width * 0.35,
      duration: 3.2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });

    const sparkles = new Container();
    this.sparkleRoot = sparkles;
    app.stage.addChild(sparkles);
  }

  /** The ticket under the foil: dark card, prize-colored glow, big label, code chip. */
  private drawPrizeLayer(width: number, height: number): Container {
    const layer = new Container();
    const { branding } = this.options.config;
    const segment = this.segment;
    const g = this.gradients;
    const fontFamily = branding.fontFamily ?? 'system-ui, sans-serif';
    const isWin = segment.prize.isWin;
    const glowColor = isWin ? segment.color : '#8b8b9a';
    const r = 16;

    layer.addChild(
      new Graphics()
        .roundRect(0, 0, width, height, r)
        // Solid base; the radial glow on top adds the depth.
        .fill(branding.secondaryColor),
    );
    // Prize-colored glow; transparent last stop (see Gradients.radial).
    const glowR = Math.max(width, height) * 0.62;
    layer.addChild(
      new Graphics()
        .roundRect(0, 0, width, height, r)
        .fill(g.radial([[0, glowColor, isWin ? 0.55 : 0.18], [0.55, glowColor, isWin ? 0.16 : 0.05], [1, glowColor, 0]], width / 2, height * 0.55, glowR)),
    );
    // Guilloché-style rings, like a banknote / premium ticket.
    const rings = new Graphics();
    for (let i = 1; i <= 7; i++) rings.circle(width / 2, height * 0.55, i * Math.min(width, height) * 0.11);
    rings.stroke({ width: 1, color: 0xffffff, alpha: 0.05 });
    layer.addChild(rings);
    layer.addChild(new Graphics().roundRect(8, 8, width - 16, height - 16, r - 6).stroke({ width: 1, color: 0xffffff, alpha: 0.14 }));

    // Header: brand mark left, ticket number right.
    const small = Math.max(10, height * 0.055);
    const brand = new Text({
      text: branding.centerLabel.toUpperCase(),
      style: { fill: branding.primaryColor, fontSize: small, fontWeight: '800', letterSpacing: small * 0.2, fontFamily },
    });
    brand.position.set(20, 18);
    const serial = new Text({
      text: `Nº ${String(1000 + ((this.segmentIndex * 7919) % 9000)).padStart(4, '0')}`,
      style: { fill: 0xffffff, fontSize: small, fontWeight: '600', letterSpacing: small * 0.08, fontFamily },
    });
    serial.alpha = 0.4;
    serial.anchor.set(1, 0);
    serial.position.set(width - 20, 18);
    layer.addChild(brand, serial);

    const titleSize = Math.max(22, Math.min(width * 0.12, height * 0.2));
    const title = new Text({
      text: isWin ? segment.label : 'No luck this time',
      style: {
        fill: isWin ? 0xffffff : 0xb8b8c6,
        fontSize: isWin ? titleSize : titleSize * 0.62,
        fontWeight: '800',
        align: 'center',
        letterSpacing: -titleSize * 0.01,
        fontFamily,
        dropShadow: isWin ? { color: glowColor, alpha: 0.9, blur: 14, distance: 0, angle: 0 } : undefined,
      },
    });
    if (title.width > width * 0.86) title.scale.set((width * 0.86) / title.width);
    title.anchor.set(0.5);
    title.position.set(width / 2, height / 2 + (isWin ? -2 : 6));
    layer.addChild(title);
    this.prizeTitle = title;

    if (isWin) {
      const code = new Text({
        text: segment.prize.code,
        style: { fill: onColor(segment.color), fontSize: small * 1.15, fontWeight: '800', letterSpacing: small * 0.18, fontFamily: 'ui-monospace, Menlo, monospace' },
      });
      code.anchor.set(0.5);
      const cw = code.width + small * 2.2;
      const ch = code.height + small * 0.9;
      const cy = height / 2 + titleSize * 0.5 + ch * 0.8;
      layer.addChild(new Graphics().roundRect(width / 2 - cw / 2, cy - ch / 2, cw, ch, ch / 2).fill(segment.color));
      code.position.set(width / 2, cy);
      layer.addChild(code);
    }

    return layer;
  }

  private buildCover(width: number, height: number): Sprite {
    this.coverTexture?.destroy(true);

    // Match the canvas DPR so the foil and erase edges stay crisp on retina.
    const coverTexture = RenderTexture.create({ width, height, resolution: this.app!.renderer.resolution });
    const { branding, copy } = this.options.config;
    this.foil.paint(this.app!.renderer, coverTexture, {
      width,
      height,
      baseColor: branding.secondaryColor,
      accentColor: branding.primaryColor,
      cornerRadius: 16,
      hint: copy.scratchHint ?? 'SCRATCH TO REVEAL',
      hintSize: Math.max(11, Math.min(width, height) * 0.055),
      fontFamily: branding.fontFamily,
    });

    this.coverTexture = coverTexture;
    this.coverSprite = new Sprite(coverTexture);
    return this.coverSprite;
  }

  private buildSheen(width: number, height: number): Graphics {
    const sheen = new Graphics();
    sheen.moveTo(0, 0);
    sheen.lineTo(width * 0.22, 0);
    sheen.lineTo(width * 0.08, height);
    sheen.lineTo(-width * 0.12, height);
    sheen.closePath();
    sheen.fill({ color: 0xffffff, alpha: 0.14 });
    sheen.x = -width * 0.15;
    sheen.eventMode = 'none';
    return sheen;
  }

  private attachPointerEvents(): void {
    const canvas = this.app!.canvas as HTMLCanvasElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointerleave', this.handlePointerUp);
  }

  private toLocalPoint(e: PointerEvent): { x: number; y: number } {
    const rect = (this.app!.canvas as HTMLCanvasElement).getBoundingClientRect();
    const { width, height } = this.app!.screen;
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    };
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.revealed || this.activePointerId !== null) return;
    this.activePointerId = e.pointerId;
    try {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    } catch {
      // capture optional
    }

    if (!this.started) {
      this.started = true;
      this.options.onRevealStart?.();
    }

    const point = this.toLocalPoint(e);
    this.softStamp(point);
    this.spawnSparkles(point);
    this.lastPoint = point;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.revealed || e.pointerId !== this.activePointerId || !this.lastPoint) return;
    const point = this.toLocalPoint(e);
    this.softEraseLine(this.lastPoint, point);
    this.spawnSparkles(point);
    if (this.sheen) {
      this.sheen.x = point.x - (this.app?.screen.width ?? 0) * 0.08;
    }
    this.lastPoint = point;
    this.checkProgress();
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.lastPoint = null;
  };

  /** Irregular soft edge: main stamp + jittered satellite stamps. */
  private softStamp(point: { x: number; y: number }): void {
    const brush = this.eraserBrush;
    brush.clear();
    brush.circle(point.x, point.y, ERASER_RADIUS).fill(0xffffff);
    const offsets = [
      [8, -6],
      [-7, 5],
      [5, 9],
      [-9, -4],
      [0, -10],
    ];
    for (const [ox, oy] of offsets) {
      brush.circle(point.x + ox, point.y + oy, ERASER_RADIUS * 0.45).fill(0xffffff);
    }
    brush.blendMode = 'erase';
    this.app!.renderer.render({ container: this.eraserRoot, target: this.coverTexture!, clear: false });
    this.markCellsNear(point.x, point.y);
  }

  private softEraseLine(from: { x: number; y: number }, to: { x: number; y: number }): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(length / (CELL_SIZE / 2)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.softStamp({ x: from.x + dx * t, y: from.y + dy * t });
    }
  }

  private spawnSparkles(point: { x: number; y: number }): void {
    const root = this.sparkleRoot;
    if (!root || this.revealed) return;
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const flake = new Graphics()
        .circle(0, 0, 1.2 + Math.random() * 2)
        .fill({ color: Math.random() > 0.5 ? 0xffffff : 0xc8d0e0, alpha: 0.9 });
      flake.x = point.x + (Math.random() - 0.5) * 18;
      flake.y = point.y + (Math.random() - 0.5) * 18;
      root.addChild(flake);
      gsap.to(flake, {
        y: flake.y + 12 + Math.random() * 18,
        x: flake.x + (Math.random() - 0.5) * 20,
        alpha: 0,
        duration: 0.35 + Math.random() * 0.25,
        ease: 'power2.out',
        onComplete: () => flake.destroy(),
      });
    }
  }

  private markCellsNear(x: number, y: number): void {
    const grid = this.grid;
    if (!grid) return;
    const r = ERASER_RADIUS + 10;
    const minCol = Math.max(0, Math.floor((x - r) / CELL_SIZE));
    const maxCol = Math.min(grid.cols - 1, Math.floor((x + r) / CELL_SIZE));
    const minRow = Math.max(0, Math.floor((y - r) / CELL_SIZE));
    const maxRow = Math.min(grid.rows - 1, Math.floor((y + r) / CELL_SIZE));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cx = col * CELL_SIZE + CELL_SIZE / 2;
        const cy = row * CELL_SIZE + CELL_SIZE / 2;
        if ((cx - x) ** 2 + (cy - y) ** 2 <= r ** 2) {
          grid.scratched.add(row * grid.cols + col);
        }
      }
    }
  }

  private checkProgress(): void {
    const grid = this.grid;
    if (this.revealed || !grid) return;
    const progress = grid.scratched.size / (grid.cols * grid.rows);
    if (progress - this.lastProgressEmit >= 0.08) {
      this.lastProgressEmit = progress;
      this.options.onScratchProgress?.(progress);
    }
    if (progress < REVEAL_THRESHOLD) return;

    this.revealed = true;
    if (this.sheen) this.sheen.visible = false;
    this.sheenTween?.kill();

    if (this.prizeTitle) {
      gsap.fromTo(
        this.prizeTitle.scale,
        { x: 0.85, y: 0.85 },
        { x: 1.08, y: 1.08, duration: 0.28, yoyo: true, repeat: 1, ease: 'power2.out' },
      );
    }

    const sprite = this.coverSprite;
    if (!sprite) return;
    gsap.to(sprite, {
      alpha: 0,
      duration: 0.4,
      onComplete: () => {
        // Let the revealed ticket be seen before the result modal covers it.
        this.holdTimer = window.setTimeout(() => this.options.onRevealEnd?.(this.segment), REVEAL_HOLD_MS);
      },
    });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.holdTimer !== null) window.clearTimeout(this.holdTimer);
    this.sheenTween?.kill();
    gsap.killTweensOf(this.coverSprite);
    if (this.prizeTitle) gsap.killTweensOf(this.prizeTitle.scale);
    this.eraserRoot.destroy({ children: true });
    this.coverTexture?.destroy(true);
    this.app?.destroy(true, { children: true });
    this.gradients.release();
    this.foil.destroy();
    this.app = null;
    this.coverSprite = null;
    this.coverTexture = null;
    this.prizeTitle = null;
    this.sheen = null;
    this.sparkleRoot = null;
  }
}
