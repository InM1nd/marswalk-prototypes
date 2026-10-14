import { createContext } from 'react';

export const ASSET_STYLES = [
  { id: 'svg', label: 'Original SVG', description: 'Klar & leicht' },
  { id: 'soft-3d', label: 'Soft 3D', description: 'Glänzende Miniaturen' },
  { id: 'graphic-pop', label: 'Graphic Pop', description: 'Spielbare Sticker' },
  { id: 'paper-cut', label: 'Paper Cut', description: 'Papier & Handwerk' },
  { id: 'comic', label: 'Comic', description: 'Konturen & Halbtöne' },
  { id: 'neon', label: 'Neon Arcade', description: 'Leuchtende Collectibles' },
] as const;
export type AssetStyle = (typeof ASSET_STYLES)[number]['id'];
export const AssetStyleContext = createContext<AssetStyle>('svg');

export function styleAssetUrl(style: Exclude<AssetStyle, 'svg'>, kind: string): string {
  return `${import.meta.env.BASE_URL}asset-styles/${style}/${kind}.png`;
}
