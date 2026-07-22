import { Application, Container, Graphics, RenderTexture, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import type { LottoConfig, LottoSymbol } from '../config/lottoSchema';
import type { LottoResult } from '../lib/lottoResolver';
import { buildFoilCoverArt } from './foilCover';

export interface LottoEngineOptions {
  container: HTMLElement;
  config: LottoConfig;
  onRevealStart?: () => void;
  /** Fires once every tile has been individually scratched clear. */
  onRevealEnd?: (result: LottoResult) => void;
  onReady?: () => void;
}

// Same per-tile grid-coverage technique as ScratchEngine (see its comments) —
// just scaled down to a tile instead of a full card.
const TILE_REVEAL_THRESHOLD = 0.5;
const ERASER_RADIUS = 15;
const CELL_SIZE = 10;
const TILE_GAP = 8;

interface TileCoverageGrid {
  cols: number;
  rows: number;
  scratched: Set<number>;
}

interface Tile {
  symbolId: string;
  x: number;
  y: number;
  size: number;
  coverTexture: RenderTexture;
  coverSprite: Sprite;
  grid: TileCoverageGrid;
  revealed: boolean;
}

export class LottoEngine {
  private app: Application | null = null;
  private destroyed = false;
  private options: LottoEngineOptions;

  private tiles: Tile[] = [];
  private result: LottoResult | null = null;
  private revealedCount = 0;
  private started = false;

  // A container's own blendMode isn't honored when it's the root passed to
  // renderer.render() — wrapped in a throwaway root so 'erase' actually
  // composites against the target tile's existing cover content.
  private eraserBrush = new Graphics();
  private eraserRoot = new Container();

  private activePointerId: number | null = null;
  private activeTileIndex: number | null = null;
  private lastLocalPoint: { x: number; y: number } | null = null;
  private sparkleRoot: Container | null = null;
  private iconByTile = new Map<number, Text>();

  constructor(options: LottoEngineOptions) {
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
    app.canvas.style.touchAction = 'none';

    this.build();
    app.renderer.on('resize', () => this.build());
    this.attachPointerEvents();

    this.options.onReady?.();
  }

  /** Arms the board with an already-resolved grid and resets every tile's cover. */
  reveal(result: LottoResult): void {
    this.result = result;
    this.started = false;
    this.revealedCount = 0;
    this.activeTileIndex = null;
    this.lastLocalPoint = null;
    this.build();
  }

  private build(): void {
    const app = this.app;
    const result = this.result;
    if (!app || !result) return;

    const { width, height } = app.screen;
    if (width <= 0 || height <= 0) return;

    for (const tile of this.tiles) tile.coverTexture.destroy(true);
    app.stage.removeChildren();
    this.iconByTile.clear();
    this.sparkleRoot = new Container();

    const { rows, cols } = this.options.config.grid;
    const tileSize = Math.min((width - TILE_GAP * (cols + 1)) / cols, (height - TILE_GAP * (rows + 1)) / rows);
    const boardWidth = tileSize * cols + TILE_GAP * (cols + 1);
    const boardHeight = tileSize * rows + TILE_GAP * (rows + 1);
    const originX = (width - boardWidth) / 2;
    const originY = (height - boardHeight) / 2;

    this.tiles = result.cells.map((symbolId, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = originX + TILE_GAP + col * (tileSize + TILE_GAP);
      const y = originY + TILE_GAP + row * (tileSize + TILE_GAP);
      return this.buildTile(symbolId, x, y, tileSize, index);
    });
    if (this.sparkleRoot) app.stage.addChild(this.sparkleRoot);
  }

  private buildTile(symbolId: string, x: number, y: number, size: number, index: number): Tile {
    const app = this.app!;
    const symbol = this.symbolFor(symbolId);
    const { branding } = this.options.config;

    const prizeLayer = new Container();
    prizeLayer.x = x;
    prizeLayer.y = y;
    prizeLayer.addChild(new Graphics().roundRect(0, 0, size, size, 10).fill(branding.primaryColor));
    prizeLayer.addChild(
      new Graphics().roundRect(3, 3, size - 6, size - 6, 8).stroke({ width: 1, color: 0xffffff, alpha: 0.2 }),
    );
    const icon = new Text({ text: symbol.icon, style: { fontSize: size * 0.5 } });
    icon.anchor.set(0.5);
    icon.x = size / 2;
    icon.y = size / 2;
    prizeLayer.addChild(icon);
    this.iconByTile.set(index, icon);
    app.stage.addChild(prizeLayer);

    const coverTexture = RenderTexture.create({ width: size, height: size });
    const coverArt = buildFoilCoverArt({
      width: size,
      height: size,
      baseColor: branding.secondaryColor,
      accentColor: branding.primaryColor,
      cornerRadius: 10,
      hint: size >= 64 ? 'SCRATCH' : undefined,
      hintSize: Math.max(8, size * 0.14),
      watermark: branding.centerLabel,
    });
    app.renderer.render({ container: coverArt, target: coverTexture, clear: true });
    coverArt.destroy({ children: true });

    const coverSprite = new Sprite(coverTexture);
    coverSprite.x = x;
    coverSprite.y = y;
    app.stage.addChild(coverSprite);

    return {
      symbolId,
      x,
      y,
      size,
      coverTexture,
      coverSprite,
      grid: {
        cols: Math.ceil(size / CELL_SIZE),
        rows: Math.ceil(size / CELL_SIZE),
        scratched: new Set(),
      },
      revealed: false,
    };
  }

  private symbolFor(symbolId: string): LottoSymbol {
    return this.options.config.symbols.find((s) => s.id === symbolId)!;
  }

  private attachPointerEvents(): void {
    const canvas = this.app!.canvas as HTMLCanvasElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointerleave', this.handlePointerUp);
  }

  private toStagePoint(e: PointerEvent): { x: number; y: number } {
    const rect = (this.app!.canvas as HTMLCanvasElement).getBoundingClientRect();
    const { width, height } = this.app!.screen;
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    };
  }

  private tileIndexAt(stagePoint: { x: number; y: number }): number | null {
    const index = this.tiles.findIndex(
      (t) =>
        stagePoint.x >= t.x && stagePoint.x <= t.x + t.size && stagePoint.y >= t.y && stagePoint.y <= t.y + t.size,
    );
    return index === -1 ? null : index;
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.activePointerId !== null) return;
    this.activePointerId = e.pointerId;
    try {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    } catch {
      // See ScratchEngine — some browsers reject capture for an id that's
      // already gone; the drag still works without it.
    }

    if (!this.started) {
      this.started = true;
      this.options.onRevealStart?.();
    }

    this.scratchAt(this.toStagePoint(e));
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.activePointerId) return;
    this.scratchAt(this.toStagePoint(e));
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.activeTileIndex = null;
    this.lastLocalPoint = null;
  };

  private scratchAt(stagePoint: { x: number; y: number }): void {
    const tileIndex = this.tileIndexAt(stagePoint);
    if (tileIndex === null) return;
    const tile = this.tiles[tileIndex];
    if (tile.revealed) return;

    const local = { x: stagePoint.x - tile.x, y: stagePoint.y - tile.y };

    // Entering a different tile mid-drag starts a fresh stroke on it — a line
    // segment spanning two different tiles' textures would be meaningless.
    if (tileIndex !== this.activeTileIndex) {
      this.activeTileIndex = tileIndex;
      this.lastLocalPoint = null;
    }

    if (this.lastLocalPoint) {
      this.softEraseLine(tile, this.lastLocalPoint, local);
    } else {
      this.softStamp(tile, local);
    }
    this.spawnSparkles(tile.x + local.x, tile.y + local.y);
    this.lastLocalPoint = local;

    this.checkTileProgress(tile);
  }

  private softStamp(tile: Tile, point: { x: number; y: number }): void {
    const brush = this.eraserBrush;
    brush.clear();
    brush.circle(point.x, point.y, ERASER_RADIUS).fill(0xffffff);
    for (const [ox, oy] of [[5, -4], [-4, 3], [3, 5], [-5, -2]]) {
      brush.circle(point.x + ox, point.y + oy, ERASER_RADIUS * 0.4).fill(0xffffff);
    }
    brush.blendMode = 'erase';
    this.app!.renderer.render({ container: this.eraserRoot, target: tile.coverTexture, clear: false });
    this.markCellsNear(tile, point.x, point.y);
  }

  private softEraseLine(tile: Tile, from: { x: number; y: number }, to: { x: number; y: number }): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(length / (CELL_SIZE / 2)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.softStamp(tile, { x: from.x + dx * t, y: from.y + dy * t });
    }
  }

  private spawnSparkles(x: number, y: number): void {
    const root = this.sparkleRoot;
    if (!root) return;
    for (let i = 0; i < 2; i++) {
      const flake = new Graphics()
        .circle(0, 0, 1 + Math.random() * 1.5)
        .fill({ color: 0xffffff, alpha: 0.85 });
      flake.x = x + (Math.random() - 0.5) * 10;
      flake.y = y + (Math.random() - 0.5) * 10;
      root.addChild(flake);
      gsap.to(flake, {
        y: flake.y + 8 + Math.random() * 10,
        alpha: 0,
        duration: 0.28,
        onComplete: () => flake.destroy(),
      });
    }
  }

  private markCellsNear(tile: Tile, x: number, y: number): void {
    const { grid } = tile;
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

  private checkTileProgress(tile: Tile): void {
    if (tile.revealed) return;
    const progress = tile.grid.scratched.size / (tile.grid.cols * tile.grid.rows);
    if (progress < TILE_REVEAL_THRESHOLD) return;

    tile.revealed = true;
    gsap.to(tile.coverSprite, {
      alpha: 0,
      duration: 0.3,
      onComplete: () => {
        this.revealedCount += 1;
        if (this.revealedCount === this.tiles.length && this.result) {
          this.highlightMatches();
          this.options.onRevealEnd?.(this.result);
        }
      },
    });
  }

  private highlightMatches(): void {
    const result = this.result;
    if (!result?.isWin || !result.symbol) return;
    this.tiles.forEach((tile, index) => {
      if (tile.symbolId !== result.symbol!.id) return;
      const icon = this.iconByTile.get(index);
      if (!icon) return;
      gsap.fromTo(
        icon.scale,
        { x: 1, y: 1 },
        { x: 1.25, y: 1.25, duration: 0.22, yoyo: true, repeat: 3, ease: 'power2.out' },
      );
    });
  }

  destroy(): void {
    this.destroyed = true;
    for (const tile of this.tiles) {
      gsap.killTweensOf(tile.coverSprite);
      tile.coverTexture.destroy(true);
    }
    this.eraserRoot.destroy({ children: true });
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.tiles = [];
    this.sparkleRoot = null;
    this.iconByTile.clear();
  }
}
