import { FillGradient } from 'pixi.js';

/** [offset 0..1, color (hex string or number), alpha?] */
export type Stop = [number, string | number, number?];

function rgba(color: string | number, alpha = 1): string {
  let n = typeof color === 'number' ? color : Number.parseInt(color.replace('#', ''), 16);
  if (typeof color === 'string' && color.replace('#', '').length === 3) {
    n = Number.parseInt(color.replace('#', '').split('').map((c) => c + c).join(''), 16);
  }
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const toStops = (stops: Stop[]) => stops.map(([offset, color, alpha]) => ({ offset, color: rgba(color, alpha) }));

/**
 * Creates FillGradients in the shape's own coordinate space and remembers them:
 * each one owns a canvas texture that Graphics.destroy() never frees, so call release()
 * whenever the scene that used them is torn down.
 *
 * Radial gotcha: Pixi pre-fills the radial texture with the LAST stop color, so anything
 * outside `r` gets that color — keep the last stop transparent unless the shape fits inside `r`.
 *
 * Static art (the foil) is painted with Canvas 2D instead — see FoilPainter.
 */
export class Gradients {
  private list: FillGradient[] = [];

  private keep(g: FillGradient): FillGradient {
    this.list.push(g);
    return g;
  }

  radial(stops: Stop[], cx: number, cy: number, r: number): FillGradient {
    return this.keep(
      new FillGradient({
        type: 'radial',
        center: { x: cx, y: cy },
        innerRadius: 0,
        outerCenter: { x: cx, y: cy },
        outerRadius: r,
        textureSpace: 'global',
        colorStops: toStops(stops),
      }),
    );
  }

  release(): void {
    this.list.forEach((g) => g.destroy());
    this.list = [];
  }
}
