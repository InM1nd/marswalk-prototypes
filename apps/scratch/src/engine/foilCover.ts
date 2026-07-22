import { Container, Graphics, Text } from 'pixi.js';

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

export interface FoilCoverOptions {
  width: number;
  height: number;
  baseColor: string;
  accentColor: string;
  cornerRadius: number;
  hint?: string;
  hintSize?: number;
  watermark?: string;
}

/** Premium procedural foil for scratch cards and lotto tiles. */
export function buildFoilCoverArt(options: FoilCoverOptions): Container {
  const {
    width,
    height,
    baseColor,
    accentColor,
    cornerRadius,
    hint,
    hintSize = 15,
    watermark,
  } = options;
  const root = new Container();

  // Cooler metallic plate with brand tint.
  const plate = mixHex(mixHex(baseColor, '#b8bcc8', 0.55), '#e8eaf0', 0.2);
  root.addChild(new Graphics().roundRect(0, 0, width, height, cornerRadius).fill(plate));

  // Secondary darker wash for depth.
  root.addChild(
    new Graphics()
      .roundRect(0, 0, width, height, cornerRadius)
      .fill({ color: mixHex(baseColor, '#2a2a36', 0.4), alpha: 0.18 }),
  );

  // Diagonal sheen bands.
  const sheen = new Graphics();
  const bandCount = Math.max(5, Math.floor(width / 36));
  for (let i = -2; i < bandCount + 2; i++) {
    const x = (i / bandCount) * width;
    sheen.moveTo(x, 0);
    sheen.lineTo(x + width * 0.2, 0);
    sheen.lineTo(x + width * 0.06, height);
    sheen.lineTo(x - width * 0.12, height);
    sheen.closePath();
  }
  sheen.fill({ color: mixHex(plate, '#ffffff', 0.65), alpha: 0.28 });
  root.addChild(sheen);

  // Holographic fringe stripes along sheen edges.
  const holo = new Graphics();
  const holoColors = ['#ff6b9d', '#5ce1ff', '#c9f24a', '#b388ff'];
  for (let i = 0; i < bandCount; i++) {
    const x = (i / bandCount) * width + width * 0.02;
    holo.moveTo(x, 0);
    holo.lineTo(x + 2.5, 0);
    holo.lineTo(x - width * 0.04 + 2.5, height);
    holo.lineTo(x - width * 0.04, height);
    holo.closePath();
    holo.fill({ color: holoColors[i % holoColors.length], alpha: 0.14 });
  }
  root.addChild(holo);

  // Cross-hatch micro texture.
  const hatch = new Graphics();
  const step = Math.max(5, Math.min(12, Math.floor(Math.min(width, height) / 20)));
  for (let x = -height; x < width + height; x += step) {
    hatch.moveTo(x, 0);
    hatch.lineTo(x + height, height);
  }
  for (let x = -height; x < width + height; x += step * 2) {
    hatch.moveTo(x + height, 0);
    hatch.lineTo(x, height);
  }
  hatch.stroke({ width: 1, color: mixHex(plate, '#ffffff', 0.35), alpha: 0.16 });
  root.addChild(hatch);

  // Dense paper grain.
  const speckles = new Graphics();
  const seed = Math.floor(width * 17 + height * 31);
  const count = Math.floor((width * height) / 90);
  for (let i = 0; i < count; i++) {
    const n = (seed * (i + 1) * 1103515245 + 12345) >>> 0;
    const px = ((n % 1000) / 1000) * width;
    const py = (((n / 1000) % 1000) / 1000) * height;
    const r = 0.4 + ((n >> 20) % 12) / 12;
    const light = ((n >> 8) & 1) === 1;
    speckles.circle(px, py, r).fill({
      color: light ? '#ffffff' : mixHex(baseColor, '#1a1a22', 0.55),
      alpha: light ? 0.32 : 0.22,
    });
  }
  root.addChild(speckles);

  // Watermark monogram.
  if (watermark) {
    const mark = new Text({
      text: watermark.slice(0, 6).toUpperCase(),
      style: {
        fill: mixHex(accentColor, '#ffffff', 0.15),
        fontSize: Math.max(28, Math.min(width, height) * 0.22),
        fontWeight: 'bold',
        letterSpacing: 4,
      },
    });
    mark.anchor.set(0.5);
    mark.x = width / 2;
    mark.y = height / 2;
    mark.alpha = 0.22;
    mark.rotation = -0.35;
    root.addChild(mark);
  }

  // Bevel rim.
  root.addChild(
    new Graphics()
      .roundRect(1.5, 1.5, width - 3, height - 3, Math.max(0, cornerRadius - 1))
      .stroke({ width: 2, color: mixHex(accentColor, '#ffffff', 0.35), alpha: 0.55 }),
  );
  root.addChild(
    new Graphics()
      .roundRect(4, 4, width - 8, height - 8, Math.max(0, cornerRadius - 3))
      .stroke({ width: 1, color: '#ffffff', alpha: 0.18 }),
  );

  if (hint) {
    const label = new Text({
      text: hint,
      style: {
        fill: accentColor,
        fontSize: hintSize,
        fontWeight: 'bold',
        letterSpacing: 1.4,
      },
    });
    label.anchor.set(0.5);
    label.x = width / 2;
    label.y = height / 2;
    label.alpha = 0.95;
    root.addChild(label);
  }

  return root;
}
