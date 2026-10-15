import { useContext, type ImgHTMLAttributes } from 'react';
import { AssetStyleContext, styleAssetUrl } from './assetStyles';
import type { Art } from '../../engine/art';

export type DmAssetKind =
  | 'balea'
  | 'alverde'
  | 'ebelin'
  | 'coupon'
  | 'bomb'
  | 'box'
  | 'basket'
  | 'basketBack'
  | 'basketFront';
export const DM_PRODUCTS = [
  { kind: 'balea', name: 'Balea', detail: 'Duschgel', points: 10 },
  { kind: 'alverde', name: 'alverde', detail: 'Bio-Serum', points: 15 },
  { kind: 'ebelin', name: 'ebelin', detail: 'Make-up Blender', points: 20 },
  {
    kind: 'coupon',
    name: 'Gold-Ticket',
    detail: 'Seltener Glücksfang',
    points: 50,
  },
] as const;

const shine = (path: string) =>
  `<path d="${path}" fill="none" stroke="white" stroke-opacity=".65" stroke-width="2.5" stroke-linecap="round"/>`;
const sparkle = (x: number, y: number, color = '#FFD100') =>
  `<path d="M${x} ${y - 7}q1 6 7 7q-6 1-7 7q-1-6-7-7q6-1 7-7Z" fill="${color}"/>`;
const basketBox = { x: -60, y: -42, w: 120, h: 112 };
const basketDefs = `<defs>
  <linearGradient id="basket" x2=".8" y2="1"><stop stop-color="#FF5274"/><stop offset=".45" stop-color="#E4003A"/><stop offset="1" stop-color="#9C002D"/></linearGradient>
  <linearGradient id="inside" x2="0" y2="1"><stop stop-color="#7E002D"/><stop offset="1" stop-color="#E4003A"/></linearGradient>
  <linearGradient id="handle" x2="0" y2="1"><stop stop-color="#305D8C"/><stop offset="1" stop-color="#002855"/></linearGradient>
  <mask id="weave"><rect x="-60" y="0" width="120" height="70" fill="white"/>${Array.from({ length: 3 }, (_, row) => Array.from({ length: 8 }, (_, col) => `<rect x="${-43 + col * 11}" y="${13 + row * 12}" width="6" height="7" rx="1.5" fill="black" transform="skewX(${col < 4 ? -5 : 5})"/>`).join('')).join('')}</mask>
  </defs>`;

function basketBack(): Art {
  return {
    ...basketBox,
    svg: `${basketDefs}
    <path d="M-45 0L-36-20Q0-30 36-20L45 0" fill="url(#inside)"/>
    <path d="M-36-10L-26-32Q0-44 26-32L36-10" fill="none" stroke="url(#handle)" stroke-width="7" stroke-linejoin="round"/>
    <path d="M-24-33Q0-42 24-33" fill="none" stroke="#5681A9" stroke-width="1.2"/>
    <ellipse rx="49" ry="9" fill="#600021" stroke="#FF6285" stroke-width="3"/>`,
  };
}
function basketFront(): Art {
  return {
    ...basketBox,
    svg: `${basketDefs}
    <ellipse cy="63" rx="49" ry="5" fill="#000" opacity=".25"/>
    <path d="M-50 0Q0 12 50 0L42 51Q0 65-42 51Z" fill="#780025"/>
    <path d="M-50 0Q0 12 50 0L42 51Q0 65-42 51Z" fill="url(#basket)" mask="url(#weave)"/>
    <path d="M-50 1Q0 13 50 1" fill="none" stroke="#FF7294" stroke-width="4" stroke-linecap="round"/>
    <path d="M-42 51Q0 65 42 51" fill="none" stroke="#FF315D" stroke-width="4"/>
    ${shine('M-45 12L-40 43')}
    <rect x="-18" y="22" width="36" height="25" rx="6" fill="white"/>
    <text x="0" y="40" text-anchor="middle" fill="#002855" font-family="Arial,sans-serif" font-style="italic" font-size="20" font-weight="900">dm</text>
    <path d="M-11 42q11 4 22-1" fill="none" stroke="#FFD100" stroke-width="2"/>`,
  };
}

export function dmArt(kind: DmAssetKind): Art {
  if (kind === 'basketBack') return basketBack();
  if (kind === 'basketFront') return basketFront();
  if (kind === 'basket')
    return {
      ...basketBox,
      svg: basketBack().svg + basketFront().svg.replace(basketDefs, ''),
    };
  const base = { x: -32, y: -38, w: 64, h: 76 };
  switch (kind) {
    case 'balea':
      return {
        ...base,
        svg: `<defs><linearGradient id="b" x2="1" y2=".5"><stop stop-color="#78EEFF"/><stop offset=".45" stop-color="#009FE3"/><stop offset="1" stop-color="#0067A4"/></linearGradient><linearGradient id="p" x2="0" y2="1"><stop stop-color="#FF709B"/><stop offset="1" stop-color="#E4003A"/></linearGradient></defs>
      <path d="M-11-25Q-25-14-21 9L-19 27Q0 35 19 27L21 9Q25-14 11-25Z" fill="url(#b)" stroke="#0077B7" stroke-width="1"/>
      <rect x="-12" y="-33" width="24" height="12" rx="4" fill="url(#p)"/><path d="M-10-27H10" stroke="#AA0641"/>
      <path d="M-19-2Q0-15 19-2L18 20Q0 30-18 20Z" fill="#EAFBFF"/><path d="M-18 11Q-5 19 7 10T19 11L18 21Q0 30-18 21Z" fill="url(#p)"/>
      <text x="0" y="4" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" font-style="italic" font-weight="bold" fill="#002855">Balea</text>
      <path d="M-11 7Q0 13 11 7" stroke="#009FE3" fill="none" stroke-width="1"/>${shine('M-15-16Q-21-2-16 20')}<circle cx="11" cy="18" r="3" fill="#FFBBD0"/>`,
      };
    case 'alverde':
      return {
        ...base,
        svg: `<defs><linearGradient id="a" x2="1" y2=".5"><stop stop-color="#68D9A0"/><stop offset=".4" stop-color="#168656"/><stop offset="1" stop-color="#074F39"/></linearGradient><linearGradient id="g" x2="1"><stop stop-color="#FFE9A0"/><stop offset=".5" stop-color="#F5B93A"/><stop offset="1" stop-color="#9F6B14"/></linearGradient></defs>
      <rect x="-7" y="-35" width="14" height="16" rx="6" fill="#142F25"/><rect x="-11" y="-22" width="22" height="10" rx="2" fill="url(#g)"/>
      <path d="M-9-12Q-20-9-20 2V26Q0 34 20 26V2Q20-9 9-12Z" fill="url(#a)"/>
      <rect x="-15" y="1" width="30" height="22" rx="3" fill="#F0F7DF"/>
      <text x="0" y="9" text-anchor="middle" font-family="Arial,sans-serif" font-size="7" fill="#145237">alverde</text>
      <path d="M-5 18Q-4 10 6 12Q7 21-5 18Z" fill="#328558"/><path d="M-4 19L4 13" stroke="#F1FFD9" stroke-width=".7"/>${shine('M-14-5V25')}<path d="M-7-18H7" stroke="#FFF3C9" opacity=".7"/>`,
      };
    case 'ebelin':
      return {
        ...base,
        svg: `<defs><radialGradient id="e" cx=".32" cy=".3" r=".8"><stop stop-color="#FFE4EE"/><stop offset=".5" stop-color="#F5A4C5"/><stop offset="1" stop-color="#D35791"/></radialGradient><pattern id="pores" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".4" fill="#962A63" opacity=".15"/></pattern></defs>
      <path id="sponge" d="M0-31Q-5-20-16-3Q-32 23-10 30Q18 40 23 15Q25 2 11-15Z" fill="url(#e)"/>
      <use href="#sponge" fill="url(#pores)"/>${shine('M-6-15Q-17 0-17 12')}<ellipse cx="-6" cy="29" rx="12" ry="2" fill="#CA4D84" opacity=".35"/>
      ${sparkle(24, -20, '#FFF4BD')}${sparkle(-25, 4, '#FFF1F7')}`,
      };
    case 'coupon':
      return {
        x: -36,
        y: -29,
        w: 72,
        h: 58,
        svg: `<defs><linearGradient id="t" x2="1" y2="1"><stop stop-color="#FFF3B7"/><stop offset=".4" stop-color="#FFD100"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs>
      <path d="M-29-20H29V-8Q18-8 18 0Q18 8 29 8V20H-29V8Q-18 8-18 0Q-18-8-29-8Z" fill="url(#t)" stroke="#FFF0A5" stroke-width="1.5"/>
      <path d="M-13-15V15M13-15V15" stroke="#A96804" stroke-opacity=".5" stroke-dasharray="2 2"/>
      <text x="0" y="5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="13" fill="#744109">-20%</text>
      ${shine('M-25-16H24')}${sparkle(29, -22)}${sparkle(-30, 22, '#FFF3B7')}`,
      };
    case 'bomb':
      return {
        ...base,
        svg: `<defs><radialGradient id="bomb" cx=".3" cy=".2" r=".9"><stop stop-color="#647084"/><stop offset=".6" stop-color="#28313E"/><stop offset="1" stop-color="#080F1C"/></radialGradient></defs>
      <path d="M0-24L7-19L19-23L20-11L28-5L23 6L27 18L15 21L7 31L-4 26L-17 29L-21 16L-30 7L-24-4L-27-16L-13-18Z" fill="url(#bomb)" stroke="#7E8B9E" stroke-width="1"/>
      <path d="M1-21Q-5-35 9-32" fill="none" stroke="#F5B861" stroke-width="3"/>
      <path d="M10-34L8-28L17-30L12-23L20-27L19-36Z" fill="#FFD100"/>${sparkle(20, -31, '#FF6536')}
      <path d="M-11-2L10 16M11-2L-10 16" stroke="#FF1E56" stroke-width="7" stroke-linecap="round"/>
      ${shine('M-18-8Q-13-16-6-16')}`,
      };
    case 'box':
      return {
        ...base,
        svg: `<defs><linearGradient id="c" x2="1" y2="1"><stop stop-color="#E0B988"/><stop offset="1" stop-color="#9D653B"/></linearGradient></defs>
      <path d="M-24-8L1-19L25-4L19 25L-4 31L-27 17Z" fill="url(#c)" stroke="#744523" stroke-width="1.5"/>
      <path d="M-24-8L-30-19L-3-25L1-19L7-30L29-13L25-4L0 8Z" fill="#D8AC77" stroke="#966538" stroke-width="1.5"/>
      <path d="M0 8L-4 31M0 8L25-4M0 8L-24-8" fill="none" stroke="#83522F" stroke-width="2"/>
      <path d="M-13-3L-9 24" stroke="#F1D4AA" stroke-width="7" opacity=".7"/><path d="M7 17L15 12L12 21L19 22" fill="none" stroke="#6E4225"/>
      <path d="M-22 14L-12 17" stroke="#895635" stroke-width="2"/>`,
      };
  }
}

export function dmSvg(kind: DmAssetKind): string {
  const a = dmArt(kind);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${a.w * 3}" height="${a.h * 3}" viewBox="${a.x} ${a.y} ${a.w} ${a.h}">${a.svg}</svg>`;
}
export function dmDataUrl(kind: DmAssetKind): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dmSvg(kind))}`;
}
/** Works with CanvasRenderingContext2D.drawImage; Pixi uses the existing svgTexture helper. */
export async function dmImage(kind: DmAssetKind): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = dmDataUrl(kind);
  await image.decode();
  return image;
}
export function DmAsset({
  kind,
  alt = '',
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { kind: DmAssetKind }) {
  const style = useContext(AssetStyleContext);
  const src = style === 'svg' ? dmDataUrl(kind) : styleAssetUrl(style, kind);
  return <img src={src} alt={alt} width={120} height={140} {...props} />;
}
export function DmLogo() {
  return (
    <span className="dm-logo" aria-label="dm drogerie markt">
      dm
      <svg viewBox="0 0 56 12" aria-hidden="true">
        <path d="M2 4Q26 12 52 3" stroke="#FFD100" strokeWidth="7" fill="none" />
        <path d="M2 7Q25 2 52 8" stroke="#E4003A" strokeWidth="4" fill="none" />
      </svg>
    </span>
  );
}
export function Heart({ filled = true }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`heart${filled ? '' : ' heart--empty'}`} aria-hidden="true">
      <path d="M12 21L3 12C-4 4 6-2 12 5C18-2 28 4 21 12Z" fill="currentColor" />
    </svg>
  );
}

export function dmBackdrop(kind: 'sky' | 'far' | 'mid' | 'roof'): Art {
  if (kind === 'sky')
    return {
      x: 0,
      y: 0,
      w: 360,
      h: 640,
      svg: `<defs><linearGradient id="sky" x2=".5" y2="1"><stop stop-color="#002855"/><stop offset=".6" stop-color="#0A1931"/><stop offset="1" stop-color="#172747"/></linearGradient><radialGradient id="light"><stop stop-color="#009FE3" stop-opacity=".16"/><stop offset="1" stop-color="#009FE3" stop-opacity="0"/></radialGradient></defs><rect width="360" height="640" fill="url(#sky)"/><ellipse cx="70" cy="180" rx="230" ry="270" fill="url(#light)"/><path d="M0 0L100 560M360 0L260 560" stroke="white" opacity=".025" stroke-width="70"/>`,
    };
  if (kind === 'roof')
    return {
      x: 0,
      y: 0,
      w: 360,
      h: 220,
      svg: `<defs><linearGradient id="floor" x2="0" y2="1"><stop stop-color="#263455"/><stop offset="1" stop-color="#091429"/></linearGradient></defs><rect width="360" height="220" fill="url(#floor)"/><path d="M0 0H360" stroke="#FF1E56" stroke-opacity=".3"/>${[35, 90, 170].map((y) => `<path d="M0 ${y}H360" stroke="#7EA1C9" stroke-opacity=".09"/>`).join('')}<path d="M90 0L0 220M180 0V220M270 0L360 220" stroke="#7EA1C9" stroke-opacity=".09"/>`,
    };
  return {
    x: 0,
    y: 0,
    w: 720,
    h: 160,
    svg: `<rect width="720" height="160" fill="none"/>${Array.from({ length: 6 }, (_, i) => `<g opacity="${kind === 'far' ? '.1' : '.16'}" transform="translate(${i * 120},0)"><rect x="12" y="55" width="94" height="100" rx="7" fill="#42618A"/><path d="M24 79H94M24 116H94" stroke="#91B4D9" stroke-width="3"/>${[28, 48, 68, 88].map((x, j) => `<rect x="${x}" y="${j % 2 ? 88 : 92}" width="10" height="22" rx="3" fill="${j % 2 ? '#009FE3' : '#E4003A'}"/>`).join('')}</g>`).join('')}`,
  };
}
