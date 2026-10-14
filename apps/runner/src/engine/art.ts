import { CanvasSource, Texture } from 'pixi.js';

/**
 * "Premium Glossy" art, authored as SVG (same source as public/characters.html) and
 * rasterised once per engine into textures. SVG-as-image can't use web fonts, so all
 * copy (billboards, floating scores) is drawn with Pixi Text instead.
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

const D = 'rgba(0,0,0,.2)';
const L = 'rgba(255,255,255,.4)';

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => Number.parseInt(h.replace('#', ''), 16);
  const A = p(a);
  const B = p(b);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// Deterministic hash noise so strips look the same on every load (and tile seamlessly).
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

/* ---------- Hero: scooter courier (origin = ground under the deck) ---------- */

const limb = (d: string, color: string, w: number) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

export const WHEEL_POSITIONS = [
  { x: -28, y: -9 },
  { x: 33, y: -9 },
];

export function courierBody(b: Brand): Art {
  const c = {
    jacket: b.primary, stripe: b.secondary, pants: '#3a3f58', pantsDark: '#262a3d', shoe: '#ffffff', skin: '#f2c3a0',
    helmet: b.secondary, ink: '#14141c', box: b.primary, boxMark: b.secondary, frame: '#c8ccd4', deck: b.secondary,
  };
  return {
    x: -46, y: -112, w: 82, h: 114,
    svg: `<defs>
        <linearGradient id="jk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
        <radialGradient id="hm" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
      </defs>
      <rect x="-31" y="-85" width="21" height="31" rx="4" fill="${c.box}"/>
      <rect x="-31" y="-85" width="21" height="31" rx="4" fill="url(#jk)"/>
      <rect x="-31" y="-85" width="8" height="31" rx="3" fill="${D}"/>
      <rect x="-27" y="-74" width="13" height="4" rx="2" fill="${c.boxMark}"/>
      ${limb('M-7 -48 L-13 -31 L-19 -17', c.pantsDark, 9)}
      ${limb('M29 -12 L19 -81', c.frame, 5)}
      <path d="M-41 -12 A12 12 0 0 1 -17 -14" fill="none" stroke="${c.deck}" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="-38" y="-18" width="68" height="8" rx="4" fill="${c.deck}"/>
      <rect x="-36" y="-17" width="64" height="2.5" rx="1.2" fill="${L}"/>
      ${limb('M11 -83 L27 -81', c.frame, 4)}
      <circle cx="25" cy="-57" r="3.4" fill="#fff4c9"/>
      ${limb('M-1 -48 L8 -32 L4 -17', c.pants, 9)}
      <rect x="-26" y="-22" width="14" height="7" rx="3" fill="${c.shoe}"/><rect x="-2" y="-22" width="14" height="7" rx="3" fill="${c.shoe}"/>
      <path d="M-13 -46 C-15 -60 -12 -75 -6 -83 L9 -81 C13 -71 11 -57 7 -46Z" fill="${c.jacket}"/>
      <path d="M-13 -46 C-15 -60 -12 -75 -6 -83 L9 -81 C13 -71 11 -57 7 -46Z" fill="url(#jk)"/>
      <path d="M-13 -46 C-15 -60 -12 -75 -6 -83 L-2 -82 C-6 -70 -7 -58 -5 -46Z" fill="${D}"/>
      <path d="M-12 -61 L10 -63" stroke="${c.stripe}" stroke-width="3"/>
      <rect x="0" y="-89" width="6" height="7" fill="${c.skin}"/>
      <circle cx="4" cy="-94" r="9" fill="${c.skin}"/>
      <path d="M-6 -93 C-7 -107 14 -110 15 -96 L19 -95 L-6 -92Z" fill="${c.helmet}"/>
      <path d="M-6 -93 C-7 -107 14 -110 15 -96 L19 -95 L-6 -92Z" fill="url(#hm)"/>
      <circle cx="10" cy="-91" r="1.5" fill="${c.ink}"/><path d="M8.5 -87 q2.2 1.6 4.4 0" fill="none" stroke="${c.ink}" stroke-width="1.2" stroke-linecap="round"/>
      ${limb('M3 -77 L15 -68 L13 -81', c.jacket, 7)}
      <circle cx="13" cy="-82" r="3.6" fill="${c.skin}"/>`,
  };
}

export function wheel(b: Brand): Art {
  return {
    x: -11, y: -11, w: 22, h: 22,
    svg: `<circle r="9.5" fill="#14171f"/><circle r="7.5" fill="none" stroke="${b.primary}" stroke-width="2"/>
      ${[0, 60, 120].map((a) => `<path d="M-6 0 H6" stroke="#c8ccd4" stroke-width="1.6" transform="rotate(${a})"/>`).join('')}
      <circle r="2.6" fill="#c8ccd4"/>`,
  };
}

/* ---------- Obstacles & collectible (origin = ground centre) ---------- */

export function cone(b: Brand): Art {
  return {
    x: -20, y: -50, w: 40, h: 52,
    svg: `<defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff9a6a"/><stop offset=".55" stop-color="${b.primary}"/><stop offset="1" stop-color="#9a2c12"/></linearGradient></defs>
      <ellipse cx="0" cy="0" rx="18" ry="2.5" fill="#000" opacity=".35"/>
      <rect x="-17" y="-7" width="34" height="7" rx="2" fill="#262b3d"/><rect x="-17" y="-7" width="34" height="2" rx="1" fill="#3a4058"/>
      <path d="M-13 -7 L13 -7 L5 -46 L-5 -46Z" fill="url(#cg)"/>
      <path d="M-10.3 -20 L10.3 -20 L9 -27 L-9 -27Z M-7.6 -33 L7.6 -33 L6.8 -38 L-6.8 -38Z" fill="#f7f5ed"/>
      <path d="M-8 -9 L-3 -44" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>`,
  };
}

export function barrier(b: Brand): Art {
  const board = (y: number, h: number) =>
    `<rect x="-23" y="${y}" width="46" height="${h}" rx="2.5" fill="url(#bs)"/><rect x="-23" y="${y}" width="46" height="${h}" rx="2.5" fill="none" stroke="#000" stroke-opacity=".35"/><rect x="-22" y="${y + 1}" width="44" height="2" fill="#fff" opacity=".35"/>`;
  return {
    x: -26, y: -86, w: 52, h: 88,
    svg: `<defs><pattern id="bs" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${b.primary}"/><rect width="6" height="12" fill="#f7f5ed"/></pattern>
        <radialGradient id="bl"><stop offset="0" stop-color="${b.secondary}" stop-opacity=".9"/><stop offset="1" stop-color="${b.secondary}" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="0" cy="0" rx="22" ry="2.5" fill="#000" opacity=".35"/>
      <rect x="-17" y="-72" width="5" height="72" fill="#3a4058"/><rect x="12" y="-72" width="5" height="72" fill="#3a4058"/>
      <rect x="-20" y="-3" width="11" height="3" fill="#262b3d"/><rect x="9" y="-3" width="11" height="3" fill="#262b3d"/>
      ${board(-70, 16)}${board(-44, 14)}${board(-20, 12)}
      <circle cx="0" cy="-77" r="9" fill="url(#bl)"/><circle cx="0" cy="-76" r="3.5" fill="${b.secondary}"/><rect x="-1.5" y="-73" width="3" height="3" fill="#3a4058"/>`,
  };
}

export function coin(b: Brand): Art {
  return {
    x: -16, y: -16, w: 32, h: 32,
    svg: `<defs><radialGradient id="cc" cx=".35" cy=".3"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="${b.secondary}"/><stop offset="1" stop-color="#c98a14"/></radialGradient></defs>
      <circle r="13" fill="#b8770e"/><circle cy="-1" r="13" fill="url(#cc)"/>
      <circle cy="-1" r="9" fill="none" stroke="#8a4b00" stroke-opacity=".55" stroke-width="1.5"/>
      <path d="M1.5 -8 L-4.5 0 H0 L-1.5 6.5 L4.5 -2 H0Z" fill="#8a4b00"/>
      <path d="M-9 -6 A10 10 0 0 1 -2 -11" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
  };
}

export function glow(color: string): Art {
  return {
    x: -32, y: -32, w: 64, h: 64,
    svg: `<defs><radialGradient id="g"><stop offset="0" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle r="32" fill="url(#g)"/>`,
  };
}

/* ---------- Background (strips tile horizontally; STRIP_W is a multiple of every step) ---------- */

export const STRIP_W = 720;

export function sky(b: Brand): Art {
  return {
    x: 0, y: 0, w: 8, h: 256,
    svg: `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05060d"/><stop offset=".55" stop-color="#151230"/><stop offset="1" stop-color="${mix(b.primary, '#1c1430', 0.78)}"/></linearGradient></defs><rect width="8" height="256" fill="url(#s)"/>`,
  };
}

export function horizonGlow(b: Brand): Art {
  return {
    x: 0, y: 0, w: 200, h: 100,
    svg: `<defs><radialGradient id="h" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="${b.primary}" stop-opacity=".55"/><stop offset=".55" stop-color="${b.primary}" stop-opacity=".12"/><stop offset="1" stop-color="${b.primary}" stop-opacity="0"/></radialGradient></defs><rect width="200" height="100" fill="url(#h)"/>`,
  };
}

export function stars(): Art {
  let s = '';
  for (let i = 0; i < 46; i++) s += `<circle cx="${(rnd(i) * STRIP_W).toFixed(1)}" cy="${(rnd(i + 100) * 220).toFixed(1)}" r="${(0.5 + rnd(i + 200) * 0.9).toFixed(2)}" fill="#fff" opacity="${(0.25 + rnd(i + 300) * 0.6).toFixed(2)}"/>`;
  s += `<circle cx="270" cy="150" r="26" fill="#fff4d6" opacity=".12"/><circle cx="270" cy="150" r="15" fill="#fff4d6"/><circle cx="276" cy="146" r="13" fill="#0b0b1a"/>`;
  return { x: 0, y: 0, w: STRIP_W, h: 240, svg: s };
}

export function farCity(): Art {
  const H = 330;
  let s = '';
  for (let x = 0, i = 0; x < STRIP_W; x += 36, i++) {
    const h = 130 + rnd(i) * 190;
    s += `<rect x="${x}" y="${H - h}" width="33" height="${h}" fill="#161a2e"/>`;
    if (rnd(i + 40) > 0.7) s += `<rect x="${x + 15}" y="${H - h - 14}" width="2" height="14" fill="#161a2e"/><circle cx="${x + 16}" cy="${H - h - 15}" r="1.6" fill="#ff4a4a"/>`;
    for (let y = H - h + 8; y < H - 10; y += 11) for (let wx = x + 4; wx < x + 29; wx += 7) if (rnd(wx * 3 + y) > 0.55) s += `<rect x="${wx}" y="${y}" width="3" height="4" fill="#323a63"/>`;
  }
  return { x: 0, y: 0, w: STRIP_W, h: H, svg: s };
}

export function midCity(b: Brand): Art {
  const H = 250;
  let s = `<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2f4d"/><stop offset="1" stop-color="#10131f"/></linearGradient></defs>`;
  for (let x = 0, i = 0; x < STRIP_W; x += 60, i++) {
    const h = 90 + rnd(i + 7) * 150;
    const w = 54;
    s += `<rect x="${x}" y="${H - h}" width="${w}" height="${h}" fill="url(#m)"/><rect x="${x}" y="${H - h}" width="${w}" height="2" fill="#fff" opacity=".08"/>`;
    if (rnd(i + 90) > 0.6) s += `<rect x="${x + 8}" y="${H - h - 12}" width="14" height="12" rx="2" fill="#1d2136"/><rect x="${x + 10}" y="${H - h - 2}" width="2" height="2" fill="#1d2136"/>`;
    for (let y = H - h + 10; y < H - 12; y += 13) for (let wx = x + 6; wx < x + w - 6; wx += 9) {
      const r = rnd(wx * 7 + y * 3);
      if (r > 0.42) s += `<rect x="${wx}" y="${y}" width="4" height="6" fill="${b.secondary}" opacity="${(0.35 + r * 0.6).toFixed(2)}"/>`;
    }
  }
  return { x: 0, y: 0, w: STRIP_W, h: H, svg: s };
}

/** Street lamps + their reflections on the wet road. Ground line at y = NEAR_GROUND. */
export const NEAR_GROUND = 150;
export function nearStreet(b: Brand): Art {
  const H = 220;
  let s = `<defs>
    <radialGradient id="lh"><stop offset="0" stop-color="${b.secondary}" stop-opacity=".55"/><stop offset="1" stop-color="${b.secondary}" stop-opacity="0"/></radialGradient>
    <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b.secondary}" stop-opacity=".16"/><stop offset="1" stop-color="${b.secondary}" stop-opacity="0"/></linearGradient>
    <linearGradient id="rf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b.secondary}" stop-opacity=".22"/><stop offset="1" stop-color="${b.secondary}" stop-opacity="0"/></linearGradient></defs>`;
  for (let x = 0; x < STRIP_W; x += 180) {
    const px = x + 40;
    const G = NEAR_GROUND;
    s += `<path d="M${px + 16} ${G - 96} L${px - 4} ${G} L${px + 44} ${G}Z" fill="url(#lc)"/>
      <rect x="${px - 2}" y="${G - 104}" width="4" height="104" fill="#0f111c"/>
      <path d="M${px} ${G - 102} q10 -8 18 -2" fill="none" stroke="#0f111c" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="${px + 10}" y="${G - 100}" width="13" height="5" rx="2" fill="#0f111c"/>
      <circle cx="${px + 16}" cy="${G - 94}" r="22" fill="url(#lh)"/><ellipse cx="${px + 16}" cy="${G - 95}" rx="5" ry="2.2" fill="#fff6d8"/>
      <rect x="${px - 5}" y="${G - 6}" width="10" height="6" rx="1.5" fill="#0f111c"/>
      <ellipse cx="${px + 16}" cy="${G + 34}" rx="10" ry="34" fill="url(#rf)"/>`;
    if ((x / 180) % 2) s += `<rect x="${px + 80}" y="${G - 14}" width="9" height="14" rx="3" fill="#7a1f1f"/><rect x="${px + 78}" y="${G - 10}" width="13" height="3" rx="1.5" fill="#5a1414"/>`;
    else s += `<rect x="${px + 70}" y="${G - 18}" width="34" height="3" rx="1.5" fill="#0f111c"/><rect x="${px + 73}" y="${G - 15}" width="2.5" height="15" fill="#0f111c"/><rect x="${px + 98}" y="${G - 15}" width="2.5" height="15" fill="#0f111c"/><rect x="${px + 70}" y="${G - 26}" width="34" height="3" rx="1.5" fill="#0f111c"/>`;
  }
  return { x: 0, y: 0, w: STRIP_W, h: H, svg: s };
}

/** Sidewalk + asphalt, top edge = ground line. */
export function road(b: Brand): Art {
  const H = 200;
  let s = `<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#211a2c"/><stop offset=".5" stop-color="#121119"/><stop offset="1" stop-color="#08080c"/></linearGradient></defs>
    <rect width="${STRIP_W}" height="${H}" fill="url(#a)"/>
    <rect width="${STRIP_W}" height="12" fill="#2b2440"/><rect y="12" width="${STRIP_W}" height="3" fill="#000" opacity=".4"/>
    <rect width="${STRIP_W}" height="2" fill="${b.primary}" opacity=".8"/>`;
  for (let x = 0; x < STRIP_W; x += 40) s += `<rect x="${x}" y="2" width="1.5" height="10" fill="#000" opacity=".25"/>`;
  for (let x = 0; x < STRIP_W; x += 90) s += `<rect x="${x + 20}" y="58" width="46" height="5" rx="2.5" fill="${b.secondary}" opacity=".7"/>`;
  for (let i = 0; i < 120; i++) s += `<rect x="${(rnd(i + 500) * STRIP_W).toFixed(1)}" y="${(20 + rnd(i + 600) * 170).toFixed(1)}" width="2" height="1" fill="#fff" opacity=".05"/>`;
  return { x: 0, y: 0, w: STRIP_W, h: H, svg: s };
}
