import { Application, Container, Graphics, RenderTexture, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import type { CampaignConfig, PrizeSlot } from '../config/schema';

export interface ScratchEngineOptions {
  container: HTMLElement;
  config: CampaignConfig;
  onRevealStart?: () => void;
  onRevealEnd?: (segment: PrizeSlot) => void;
  onReady?: () => void;
}

// Auto-reveal the rest once the player has scratched roughly this fraction of
// the card, so nobody has to hunt down the last few stray pixels (see
// prototype-1-wheel.md §4 stage 6).
const REVEAL_THRESHOLD = 0.55;
const ERASER_RADIUS = 26;
// Coverage is tracked on a grid, not swept stroke length — length-based area
// double-counts a stroke that re-crosses the same spot, so a scribble in one
// corner could hit the threshold while most of the card is still covered.
// Each cell only ever counts once, matching what's actually uncovered.
const CELL_SIZE = 20;

interface ScratchGrid {
  cols: number;
  rows: number;
  scratched: Set<number>;
}

export class ScratchEngine {
  private app: Application | null = null;
  private destroyed = false;
  private options: ScratchEngineOptions;

  private coverTexture: RenderTexture | null = null;
  private coverSprite: Sprite | null = null;
  // A container's own blendMode isn't honored when it's the root passed to
  // renderer.render() — it only takes effect on children within a render
  // tree. The brush is wrapped in a throwaway root so its 'erase' blend
  // mode actually composites against the existing cover texture content.
  private eraserBrush = new Graphics();
  private eraserRoot = new Container();

  private segmentIndex = 0;
  private started = false;
  private revealed = false;
  private grid: ScratchGrid | null = null;
  private lastPoint: { x: number; y: number } | null = null;
  private activePointerId: number | null = null;

  constructor(options: ScratchEngineOptions) {
    this.options = options;
    this.eraserRoot.addChild(this.eraserBrush);
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
    app.canvas.style.touchAction = 'none'; // prevent scroll hijacking the scratch gesture on mobile

    this.build();
    app.renderer.on('resize', () => this.build());
    this.attachPointerEvents();

    this.options.onReady?.();
  }

  /** Arms the card with a specific (already resolved) prize and resets the cover. */
  reveal(segmentIndex: number): void {
    this.segmentIndex = segmentIndex;
    this.started = false;
    this.revealed = false;
    this.lastPoint = null;
    this.build();
  }

  private get segment(): PrizeSlot {
    return this.options.config.prizes.segments[this.segmentIndex];
  }

  private build(): void {
    const app = this.app;
    if (!app) return;

    const { width, height } = app.screen;
    if (width <= 0 || height <= 0) return; // container not laid out yet
    this.grid = {
      cols: Math.ceil(width / CELL_SIZE),
      rows: Math.ceil(height / CELL_SIZE),
      scratched: new Set(),
    };

    app.stage.removeChildren();
    app.stage.addChild(this.drawPrizeLayer(width, height));
    app.stage.addChild(this.buildCover(width, height));
  }

  private drawPrizeLayer(width: number, height: number): Container {
    const layer = new Container();
    const { branding } = this.options.config;
    const segment = this.segment;

    const bg = new Graphics().roundRect(0, 0, width, height, 16).fill(segment.color);
    layer.addChild(bg);

    const title = new Text({
      text: segment.prize.isWin ? segment.label : 'No luck this time',
      style: { fill: segment.textColor, fontSize: 22, fontWeight: 'bold', align: 'center' },
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = height / 2 - (segment.prize.isWin ? 14 : 0);
    layer.addChild(title);

    if (segment.prize.isWin) {
      const code = new Text({
        text: segment.prize.code,
        style: { fill: branding.secondaryColor, fontSize: 15, fontWeight: 'bold' },
      });
      code.anchor.set(0.5);
      code.x = width / 2;
      code.y = height / 2 + 20;
      layer.addChild(code);
    }

    return layer;
  }

  private buildCover(width: number, height: number): Sprite {
    this.coverTexture?.destroy(true);

    const coverTexture = RenderTexture.create({ width, height });
    const coverArt = new Container();
    coverArt.addChild(new Graphics().roundRect(0, 0, width, height, 16).fill(this.options.config.branding.secondaryColor));
    const hint = new Text({
      text: 'SCRATCH TO REVEAL',
      style: { fill: this.options.config.branding.primaryColor, fontSize: 15, fontWeight: 'bold' },
    });
    hint.anchor.set(0.5);
    hint.x = width / 2;
    hint.y = height / 2;
    coverArt.addChild(hint);

    this.app!.renderer.render({ container: coverArt, target: coverTexture, clear: true });
    coverArt.destroy({ children: true });

    this.coverTexture = coverTexture;
    this.coverSprite = new Sprite(coverTexture);
    this.coverSprite.alpha = 1;
    return this.coverSprite;
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
      // Some browsers/input devices reject capture for a pointer id that's
      // already gone by the time this runs; the drag still works without
      // it, it just won't keep tracking if the pointer leaves the canvas.
    }

    if (!this.started) {
      this.started = true;
      this.options.onRevealStart?.();
    }

    const point = this.toLocalPoint(e);
    this.stamp(point);
    this.lastPoint = point;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.revealed || e.pointerId !== this.activePointerId || !this.lastPoint) return;
    const point = this.toLocalPoint(e);
    this.eraseLine(this.lastPoint, point);
    this.lastPoint = point;
    this.checkProgress();
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.lastPoint = null;
  };

  private stamp(point: { x: number; y: number }): void {
    const brush = this.eraserBrush;
    brush.clear();
    brush.circle(point.x, point.y, ERASER_RADIUS).fill(0xffffff);
    brush.blendMode = 'erase';
    this.app!.renderer.render({ container: this.eraserRoot, target: this.coverTexture!, clear: false });
    this.markCellsNear(point.x, point.y);
  }

  private eraseLine(from: { x: number; y: number }, to: { x: number; y: number }): void {
    const brush = this.eraserBrush;
    brush.clear();
    brush
      .moveTo(from.x, from.y)
      .lineTo(to.x, to.y)
      .stroke({ width: ERASER_RADIUS * 2, color: 0xffffff, cap: 'round', join: 'round' });
    brush.blendMode = 'erase';
    this.app!.renderer.render({ container: this.eraserRoot, target: this.coverTexture!, clear: false });

    // Sample cells along the stroke, not just its endpoints, so a fast drag
    // between two far-apart pointermove events still marks what the wide
    // brush actually swept.
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(length / (CELL_SIZE / 2)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.markCellsNear(from.x + dx * t, from.y + dy * t);
    }
  }

  /** Marks every grid cell whose center falls within the eraser radius of (x, y). */
  private markCellsNear(x: number, y: number): void {
    const grid = this.grid;
    if (!grid) return;
    const minCol = Math.max(0, Math.floor((x - ERASER_RADIUS) / CELL_SIZE));
    const maxCol = Math.min(grid.cols - 1, Math.floor((x + ERASER_RADIUS) / CELL_SIZE));
    const minRow = Math.max(0, Math.floor((y - ERASER_RADIUS) / CELL_SIZE));
    const maxRow = Math.min(grid.rows - 1, Math.floor((y + ERASER_RADIUS) / CELL_SIZE));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cx = col * CELL_SIZE + CELL_SIZE / 2;
        const cy = row * CELL_SIZE + CELL_SIZE / 2;
        if ((cx - x) ** 2 + (cy - y) ** 2 <= ERASER_RADIUS ** 2) {
          grid.scratched.add(row * grid.cols + col);
        }
      }
    }
  }

  private checkProgress(): void {
    const grid = this.grid;
    if (this.revealed || !grid) return;
    const progress = grid.scratched.size / (grid.cols * grid.rows);
    if (progress < REVEAL_THRESHOLD) return;

    this.revealed = true;
    const sprite = this.coverSprite;
    if (!sprite) return;
    gsap.to(sprite, {
      alpha: 0,
      duration: 0.4,
      onComplete: () => {
        this.options.onRevealEnd?.(this.segment);
      },
    });
  }

  destroy(): void {
    this.destroyed = true;
    gsap.killTweensOf(this.coverSprite);
    this.eraserRoot.destroy({ children: true });
    this.coverTexture?.destroy(true);
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.coverSprite = null;
    this.coverTexture = null;
  }
}
