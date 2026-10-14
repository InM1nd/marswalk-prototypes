import { CanvasSource, Sprite, Texture, type Renderer, type RenderTexture } from 'pixi.js';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const bl = Math.round(A.b + (B.b - A.b) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface FoilCoverOptions {
  width: number;
  height: number;
  /** Dark brand tone — used for the hint pill. */
  baseColor: string;
  /** Brand primary — tints the metal and accents the hint. */
  accentColor: string;
  cornerRadius: number;
  /** Multi-character hint renders as a pill; a single character (e.g. "?") as a round badge. */
  hint?: string;
  hintSize?: number;
  fontFamily?: string;
}

/** Premium procedural foil: brand-tinted brushed metal with an embossed diamond pattern. */
function paintFoil(ctx: CanvasRenderingContext2D, o: FoilCoverOptions): void {
  const { width, height, baseColor, accentColor, cornerRadius, hint, hintSize = 15, fontFamily } = o;
  const tint = (shade: string, t: number) => mixHex(shade, accentColor, t);

  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, cornerRadius);
  ctx.clip();

  // Metal plate, lit from above.
  const plate = ctx.createLinearGradient(0, 0, 0, height);
  plate.addColorStop(0, tint('#f6f7fa', 0.1));
  plate.addColorStop(0.42, tint('#c9ccd6', 0.12));
  plate.addColorStop(0.58, tint('#b3b7c3', 0.14));
  plate.addColorStop(1, tint('#868b98', 0.16));
  ctx.fillStyle = plate;
  ctx.fillRect(0, 0, width, height);

  // Embossed diamond grid: 1px shadow + light face reads as pressed into the foil.
  const step = Math.max(11, Math.min(width, height) / 12);
  const d = step * 0.13;
  const diamonds = (dy: number) => {
    ctx.beginPath();
    for (let row = 0, y = step / 2; y < height; row++, y += step * 0.6) {
      for (let x = row % 2 ? step : step / 2; x < width; x += step) {
        ctx.moveTo(x, y - d + dy);
        ctx.lineTo(x + d, y + dy);
        ctx.lineTo(x, y + d + dy);
        ctx.lineTo(x - d, y + dy);
        ctx.closePath();
      }
    }
    ctx.fill();
  };
  ctx.fillStyle = rgba(mixHex(accentColor, '#1a1a22', 0.6), 0.16);
  diamonds(1);
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  diamonds(0);

  // Two broad diagonal sheen bands + one faint holographic band.
  const skew = height * 0.45;
  const band = (x: number, w: number, stops: Array<[number, string]>) => {
    const g = ctx.createLinearGradient(x - skew, 0, x + w, 0);
    stops.forEach(([at, c]) => g.addColorStop(at, c));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(x + w - skew, height);
    ctx.lineTo(x - skew, height);
    ctx.closePath();
    ctx.fill();
  };
  const sheen = (a: number): Array<[number, string]> => [[0, 'rgba(255,255,255,0)'], [0.5, `rgba(255,255,255,${a})`], [1, 'rgba(255,255,255,0)']];
  band(width * 0.12, width * 0.28, sheen(0.42));
  band(width * 0.62, width * 0.14, sheen(0.3));
  band(width * 0.42, width * 0.2, [
    [0, 'rgba(255,107,157,0)'],
    [0.3, 'rgba(255,107,157,0.16)'],
    [0.5, 'rgba(92,225,255,0.18)'],
    [0.7, 'rgba(201,242,74,0.16)'],
    [1, 'rgba(179,136,255,0)'],
  ]);

  // Fine grain so it doesn't look vector-flat.
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  const seed = Math.floor(width * 17 + height * 31);
  const count = Math.floor((width * height) / 160);
  for (let i = 0; i < count; i++) {
    const n = (seed * (i + 1) * 1103515245 + 12345) >>> 0;
    const r = 0.35 + ((n >> 20) % 8) / 14;
    ctx.fillRect(((n % 1000) / 1000) * width, (((n / 1000) % 1000) / 1000) * height, r * 2, r * 2);
  }

  // Bevel: bright top edge, dark inner line.
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.roundRect(1, 1, width - 2, height - 2, Math.max(0, cornerRadius - 1));
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.roundRect(3.5, 3.5, width - 7, height - 7, Math.max(0, cornerRadius - 3));
  ctx.stroke();

  if (!hint) return;
  const single = hint.length === 1;
  ctx.font = `800 ${hintSize}px ${fontFamily ?? 'system-ui, sans-serif'}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = single ? '0px' : `${hintSize * 0.16}px`;
  const textWidth = ctx.measureText(hint).width;
  const cx = width / 2;
  const cy = height / 2;

  ctx.beginPath();
  if (single) {
    const r = hintSize * 1.05;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.arc(cx, cy + 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else {
    const pw = textWidth + hintSize * 2.4;
    const ph = hintSize * 2.1;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.roundRect(cx - pw / 2, cy - ph / 2 + 2, pw, ph, ph / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
    // Accent dots either side of the text.
    ctx.save();
    ctx.fillStyle = rgba(baseColor, 0.86);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(accentColor, 0.8);
    ctx.stroke();
    ctx.fillStyle = accentColor;
    for (const x of [cx - pw / 2 + hintSize * 0.75, cx + pw / 2 - hintSize * 0.75]) {
      ctx.beginPath();
      ctx.arc(x, cy, hintSize * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (single) {
    ctx.fillStyle = rgba(baseColor, 0.82);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(accentColor, 0.7);
    ctx.stroke();
  }
  ctx.fillStyle = single ? accentColor : '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Letter spacing adds trailing space after the last glyph; nudge back by half of it.
  ctx.fillText(hint, cx + (single ? 0 : hintSize * 0.08), cy + hintSize * 0.05);
}

/**
 * Paints foil into RenderTextures. The foil is a static image, so it's drawn with plain Canvas 2D
 * (native gradients) and uploaded through ONE reusable canvas + texture.
 *
 * Why reuse: in this Pixi version a texture source that has been rendered into a RenderTexture
 * stays referenced after destroy(), so a fresh canvas per render leaked one canvas per rebuild
 * (every live-config edit). One long-lived source sidesteps that.
 */
export class FoilPainter {
  private canvas = document.createElement('canvas');
  private source = new CanvasSource({ resource: this.canvas });
  private texture = new Texture({ source: this.source });
  private sprite = new Sprite(this.texture);

  paint(renderer: Renderer, target: RenderTexture, options: FoilCoverOptions): void {
    const resolution = target.source.resolution;
    this.source.resize(options.width, options.height, resolution);
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
    ctx.clearRect(0, 0, options.width, options.height);
    ctx.save();
    paintFoil(ctx, options);
    ctx.restore();
    this.source.update();
    this.texture.update();
    this.sprite.texture = this.texture;
    this.sprite.setSize(options.width, options.height);
    renderer.render({ container: this.sprite, target, clear: true });
  }

  destroy(): void {
    this.sprite.destroy();
    this.texture.destroy(true);
  }
}
