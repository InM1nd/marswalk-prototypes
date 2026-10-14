function toRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned.slice(0, 6);
  const n = Number.parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toNumber([r, g, b]: [number, number, number]): number {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
}

/** Mixes the color toward white (amount > 0) or black (amount < 0). Returns a Pixi color number. */
export function shade(hex: string, amount: number): number {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toNumber(toRgb(hex).map((c) => c + (target - c) * t) as [number, number, number]);
}

/** WCAG relative luminance, 0 (black) … 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const DARK_TEXT = '#0b0b10';

/** Readable text color on top of `hex`: whichever of white / near-black has the higher WCAG contrast. */
export function onColor(hex: string): string {
  const l = luminance(hex);
  const vsWhite = 1.05 / (l + 0.05);
  const vsDark = (l + 0.05) / (luminance(DARK_TEXT) + 0.05);
  return vsDark > vsWhite ? DARK_TEXT : '#ffffff';
}
