import { CanvasSource, Texture } from 'pixi.js';

/**
 * "Premium Glossy" art (same family as the runner), authored as SVG and rasterised
 * once per engine into textures. SVG-as-image can't use web fonts, so all copy is
 * drawn with Pixi Text instead.
 */

export interface Brand {
  primary: string;
  secondary: string;
}

export interface Art {
  svg: string;
  /** viewBox in logical units. */
  x: number;
  y: number;
  w: number;
  h: number;
}

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => Number.parseInt(h.replace('#', ''), 16);
  const A = p(a);
  const B = p(b);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// Deterministic hash noise so the skyline looks the same on every load (and tiles seamlessly).
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export async function svgTexture(art: Art, resolution: number, repeat = false): Promise<Texture> {
  const pw = Math.ceil(art.w * resolution);
  const ph = Math.ceil(art.h * resolution);
  // Explicit pixel size: Safari rasterises SVG images at their intrinsic size.
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="${art.x} ${art.y} ${art.w} ${art.h}">${art.svg}</svg>`;
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = pw;
    canvas.height = ph;
    canvas.getContext('2d')!.drawImage(img, 0, 0, pw, ph);
    const source = new CanvasSource({ resource: canvas, resolution, addressMode: repeat ? 'repeat' : 'clamp-to-edge' });
    return new Texture({ source });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const shine = (d: string, w = 2.4) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity=".75"/>`;

/* ---------- Catcher: insulated delivery bag (origin = centre of the open mouth) ---------- */

export const BAG_HALF_W = 46;
export const BAG_DEPTH = 56;

const BAG_BOX = { x: -54, y: -40, w: 108, h: 104 };

function bagDefs(b: Brand): string {
  return `<defs>
      <linearGradient id="bf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${mix(b.primary, '#ffffff', 0.25)}"/><stop offset=".55" stop-color="${b.primary}"/><stop offset="1" stop-color="${mix(b.primary, '#000000', 0.35)}"/></linearGradient>
      <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(b.primary, '#000000', 0.25)}"/><stop offset="1" stop-color="${mix(b.primary, '#000000', 0.55)}"/></linearGradient>
      <linearGradient id="in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2533"/><stop offset="1" stop-color="#0d0b12"/></linearGradient>
    </defs>`;
}

/** Back wall + dark opening. Drawn behind the drops, so food falls *into* the bag. */
export function bagBack(b: Brand): Art {
  return {
    ...BAG_BOX,
    svg: `${bagDefs(b)}
      <path d="M-44 -2 L-40 -34 Q0 -40 40 -34 L44 -2Z" fill="url(#bk)"/>
      <path d="M-38 -31 Q0 -36 38 -31" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>
      <ellipse cx="0" cy="0" rx="45" ry="7" fill="url(#in)"/>`,
  };
}

/** Front wall, drawn over the drops. Same box as bagBack so both share one anchor. */
export function bagFront(b: Brand): Art {
  return {
    ...BAG_BOX,
    svg: `${bagDefs(b)}
      <ellipse cx="0" cy="${BAG_DEPTH + 4}" rx="44" ry="4" fill="#000" opacity=".4"/>
      <path d="M-46 0 L-42 ${BAG_DEPTH} Q0 ${BAG_DEPTH + 5} 42 ${BAG_DEPTH} L46 0 Q0 7 -46 0Z" fill="url(#bf)"/>
      <path d="M-45 14 Q0 21 45 14 L44.4 24 Q0 31 -44.4 24Z" fill="${b.secondary}"/>
      <path d="M-45 14 Q0 21 45 14" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>
      <path d="M-46 0 Q0 7 46 0" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.5" stroke-linecap="round"/>
      ${shine('M-39 8 L-36 48', 3)}
      <rect x="-30" y="${BAG_DEPTH - 6}" width="12" height="4" rx="2" fill="#000" opacity=".25"/>
      <rect x="18" y="${BAG_DEPTH - 6}" width="12" height="4" rx="2" fill="#000" opacity=".25"/>`,
  };
}

/* ---------- Drops (origin = centre, ~48 units across) ---------- */

export function burger(): Art {
  return {
    x: -26, y: -24, w: 52, h: 48,
    svg: `<defs><radialGradient id="bn" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#ffd59a"/><stop offset=".55" stop-color="#e99a3c"/><stop offset="1" stop-color="#a95c16"/></radialGradient></defs>
      <path d="M-22 10 H22 Q22 20 12 20 H-12 Q-22 20 -22 10Z" fill="#c8761f"/>
      <rect x="-23" y="3" width="46" height="9" rx="4.5" fill="#5a2e17"/>
      <path d="M-22 2 L22 2 L15 8 L8 3 L1 9 L-6 3 L-13 8Z" fill="#ffc83d"/>
      <path d="M-23 1 Q-17 -4 -11 1 Q-5 -4 1 1 Q7 -4 13 1 Q19 -4 23 1 L23 3 L-23 3Z" fill="#5fcf54"/>
      <path d="M-22 -1 Q-22 -21 0 -21 Q22 -21 22 -1Z" fill="url(#bn)"/>
      ${[[-10, -12], [-2, -16], [7, -13], [12, -7], [-14, -6], [2, -9]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="1" fill="#fff6e0" transform="rotate(-20 ${x} ${y})"/>`).join('')}
      ${shine('M-15 -10 Q-12 -17 -5 -19')}`,
  };
}

export function pizza(): Art {
  return {
    x: -24, y: -26, w: 48, h: 52,
    svg: `<defs><linearGradient id="ch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffb627"/></linearGradient></defs>
      <path d="M-20 -18 Q0 -26 20 -18 L0 24Z" fill="url(#ch)"/>
      <path d="M-21 -19 Q0 -28 21 -19 L19 -14 Q0 -21 -19 -14Z" fill="#d1822c"/>
      <path d="M-20 -19 Q0 -27 20 -19" fill="none" stroke="#f3b25f" stroke-width="1.6"/>
      <circle cx="-6" cy="-7" r="4.6" fill="#d8352a"/><circle cx="6" cy="-3" r="4.2" fill="#d8352a"/><circle cx="-1" cy="8" r="3.6" fill="#d8352a"/>
      <circle cx="-7" cy="-8.2" r="1.4" fill="#fff" opacity=".5"/><circle cx="5" cy="-4.2" r="1.2" fill="#fff" opacity=".5"/>
      <path d="M8 -12 q3 3 1 6" fill="none" stroke="#3f9a3a" stroke-width="2" stroke-linecap="round"/>
      <path d="M-14 -10 L-4 14" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>`,
  };
}

export function donut(b: Brand): Art {
  const sprinkles = ['#ffffff', b.secondary, '#5fd0ff', '#7ee07a'];
  return {
    x: -24, y: -24, w: 48, h: 48,
    svg: `<defs><radialGradient id="gz" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffc0dc"/><stop offset=".6" stop-color="#ff6fae"/><stop offset="1" stop-color="#c93a7c"/></radialGradient>
        <mask id="hole"><rect x="-30" y="-30" width="60" height="60" fill="#fff"/><circle r="6.5" fill="#000"/></mask></defs>
      <g mask="url(#hole)">
        <circle r="20" fill="#d99448"/>
        <path d="M-19 0 Q-20 -19 0 -19 Q19 -20 19 -1 Q17 4 13 2 Q10 9 6 5 Q2 11 -3 6 Q-8 11 -11 5 Q-16 8 -19 0Z" fill="url(#gz)" transform="translate(0 2) scale(1.04)"/>
      </g>
      ${Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const r = 12.5 + (i % 2) * 1.5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r * 0.9 - 2;
        if (y > 6) return '';
        return `<rect x="${(x - 2).toFixed(1)}" y="${(y - 0.8).toFixed(1)}" width="4" height="1.6" rx=".8" fill="${sprinkles[i % 4]}" transform="rotate(${(i * 47) % 180} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
      }).join('')}
      ${shine('M-13 -9 Q-9 -15 -2 -16')}`,
  };
}

export function coin(b: Brand): Art {
  return {
    x: -20, y: -20, w: 40, h: 40,
    svg: `<defs><radialGradient id="cc" cx=".35" cy=".3"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="${b.secondary}"/><stop offset="1" stop-color="#c98a14"/></radialGradient></defs>
      <circle cy="1.5" r="17" fill="#b8770e"/><circle r="17" fill="url(#cc)"/>
      <circle r="12" fill="none" stroke="#8a4b00" stroke-opacity=".55" stroke-width="1.8"/>
      <path d="M0 -8 L2.4 -2.6 L8 -2.4 L3.6 1.2 L5 7 L0 3.8 L-5 7 L-3.6 1.2 L-8 -2.4 L-2.4 -2.6Z" fill="#8a4b00"/>
      ${shine('M-12 -7 A13 13 0 0 1 -4 -14', 2.6)}`,
  };
}

/** The bad drop: a "late delivery" alarm clock. Dark body + red rim reads as danger at a glance. */
export function clock(): Art {
  return {
    x: -26, y: -27, w: 52, h: 54,
    svg: `<defs><radialGradient id="ck" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#4a4f6e"/><stop offset=".6" stop-color="#23263a"/><stop offset="1" stop-color="#0e0f18"/></radialGradient></defs>
      <path d="M-13 15 L-17 22 M13 15 L17 22" stroke="#14151f" stroke-width="4" stroke-linecap="round"/>
      <circle cx="-14" cy="-16" r="7.5" fill="#ff3b3b"/><circle cx="14" cy="-16" r="7.5" fill="#ff3b3b"/>
      <circle cx="-16" cy="-18" r="2" fill="#fff" opacity=".6"/><circle cx="12" cy="-18" r="2" fill="#fff" opacity=".6"/>
      <rect x="-2" y="-25" width="4" height="6" rx="2" fill="#14151f"/>
      <circle r="18.5" fill="#ff3b3b"/><circle r="15" fill="url(#ck)"/>
      <path d="M-8 -6 L-3 -4 M8 -6 L3 -4" stroke="#ff5a5a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="-5" cy="-1" r="1.8" fill="#fff"/><circle cx="5" cy="-1" r="1.8" fill="#fff"/>
      <path d="M-5 8 Q0 4 5 8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      ${shine('M-12 -6 A13 13 0 0 1 -5 -12', 2)}`,
  };
}

export function glow(color: string): Art {
  return {
    x: -32, y: -32, w: 64, h: 64,
    svg: `<defs><radialGradient id="g"><stop offset="0" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle r="32" fill="url(#g)"/>`,
  };
}

/* ---------- Background: evening skyline seen from a rooftop ---------- */

export const STRIP_W = 720;

export function sky(b: Brand): Art {
  return {
    x: 0, y: 0, w: 8, h: 256,
    svg: `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05060d"/><stop offset=".5" stop-color="#171236"/><stop offset="1" stop-color="${mix(b.primary, '#1c1430', 0.65)}"/></linearGradient></defs><rect width="8" height="256" fill="url(#s)"/>`,
  };
}

export function horizonGlow(b: Brand): Art {
  return {
    x: 0, y: 0, w: 200, h: 100,
    svg: `<defs><radialGradient id="h" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="${b.primary}" stop-opacity=".6"/><stop offset=".55" stop-color="${b.primary}" stop-opacity=".14"/><stop offset="1" stop-color="${b.primary}" stop-opacity="0"/></radialGradient></defs><rect width="200" height="100" fill="url(#h)"/>`,
  };
}

export function stars(): Art {
  let s = '';
  for (let i = 0; i < 40; i++) s += `<circle cx="${(rnd(i) * 360).toFixed(1)}" cy="${(rnd(i + 100) * 300).toFixed(1)}" r="${(0.5 + rnd(i + 200) * 0.9).toFixed(2)}" fill="#fff" opacity="${(0.2 + rnd(i + 300) * 0.6).toFixed(2)}"/>`;
  return { x: 0, y: 0, w: 360, h: 320, svg: s };
}

export function farCity(): Art {
  const H = 300;
  let s = '';
  for (let x = 0, i = 0; x < STRIP_W; x += 36, i++) {
    const h = 110 + rnd(i) * 170;
    s += `<rect x="${x}" y="${H - h}" width="33" height="${h}" fill="#161a2e"/>`;
    if (rnd(i + 40) > 0.7) s += `<rect x="${x + 15}" y="${H - h - 14}" width="2" height="14" fill="#161a2e"/><circle cx="${x + 16}" cy="${H - h - 15}" r="1.6" fill="#ff4a4a"/>`;
    for (let y = H - h + 8; y < H - 10; y += 11) for (let wx = x + 4; wx < x + 29; wx += 7) if (rnd(wx * 3 + y) > 0.55) s += `<rect x="${wx}" y="${y}" width="3" height="4" fill="#323a63"/>`;
  }
  return { x: 0, y: 0, w: STRIP_W, h: H, svg: s };
}

export function midCity(b: Brand): Art {
  const H = 220;
  let s = `<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f4d"/><stop offset="1" stop-color="#10131f"/></linearGradient></defs>`;
  for (let x = 0, i = 0; x < STRIP_W; x += 60, i++) {
    const h = 70 + rnd(i + 7) * 140;
    const w = 54;
    s += `<rect x="${x}" y="${H - h}" width="${w}" height="${h}" fill="url(#m)"/><rect x="${x}" y="${H - h}" width="${w}" height="2" fill="#fff" opacity=".08"/>`;
    for (let y = H - h + 10; y < H - 12; y += 13) for (let wx = x + 6; wx < x + w - 6; wx += 9) {
      const r = rnd(wx * 7 + y * 3);
      if (r > 0.42) s += `<rect x="${wx}" y="${y}" width="4" height="6" fill="${b.secondary}" opacity="${(0.35 + r * 0.6).toFixed(2)}"/>`;
    }
  }
  return { x: 0, y: 0, w: STRIP_W, h: H, svg: s };
}

/** Rooftop the bag slides on: parapet edge + string lights. Top edge = roof line. */
export function roof(b: Brand): Art {
  const H = 220;
  let s = `<defs><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241d33"/><stop offset=".4" stop-color="#14111d"/><stop offset="1" stop-color="#08070c"/></linearGradient>
    <radialGradient id="bl"><stop offset="0" stop-color="${b.secondary}" stop-opacity=".8"/><stop offset="1" stop-color="${b.secondary}" stop-opacity="0"/></radialGradient></defs>
    <rect width="360" height="${H}" fill="url(#r)"/>
    <rect width="360" height="10" fill="#2e2642"/><rect y="10" width="360" height="3" fill="#000" opacity=".45"/>
    <rect width="360" height="2" fill="${b.primary}" opacity=".85"/>`;
  for (let x = 0; x < 360; x += 30) s += `<rect x="${x}" y="2" width="1.5" height="8" fill="#000" opacity=".3"/>`;
  for (let x = 12; x < 360; x += 24) {
    const y = 34 + Math.sin(x / 38) * 6;
    s += `<circle cx="${x}" cy="${y}" r="7" fill="url(#bl)"/><circle cx="${x}" cy="${y}" r="1.8" fill="#fff6d8"/>`;
  }
  s += `<path d="M0 34 ${Array.from({ length: 31 }, (_, i) => `L${i * 12} ${(34 + Math.sin((i * 12) / 38) * 6 - 1).toFixed(1)}`).join(' ')}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1"/>`;
  for (let i = 0; i < 60; i++) s += `<rect x="${(rnd(i + 500) * 360).toFixed(1)}" y="${(50 + rnd(i + 600) * 160).toFixed(1)}" width="2" height="1" fill="#fff" opacity=".05"/>`;
  return { x: 0, y: 0, w: 360, h: H, svg: s };
}
