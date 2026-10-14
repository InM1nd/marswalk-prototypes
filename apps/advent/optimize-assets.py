"""Resize + WebP-compress asset-masters/ into public/assets/ (what the app loads).

Masters are 1024px PNGs / lossless WebPs (~19 MB total); the calendar runs inside
Instagram/TikTok WebViews, so ship each file at ~2x its largest on-screen size.
Run after export-assets.py:  python3 apps/advent/optimize-assets.py
"""
from pathlib import Path

from PIL import Image

BASE = Path(__file__).resolve().parent
MASTERS = BASE / 'asset-masters'
OUT = BASE / 'public' / 'assets'
OUT.mkdir(parents=True, exist_ok=True)

# filename prefix -> (max width, max height, quality)
TARGETS = {
    'icon-': (384, 384, 82),
    'gift-': (640, 640, 85),
    'bg-desktop': (2400, 1500, 70),
    'bg-mobile': (1080, 1920, 70),
    'door-': (1200, 600, 80),
    'hero': (1200, 840, 80),
    'scratch-foil': (1200, 900, 80),
}

total = 0
for src in sorted(MASTERS.iterdir()):
    if src.suffix not in {'.png', '.webp'}:
        continue
    w, h, q = next(v for k, v in TARGETS.items() if src.name.startswith(k))
    img = Image.open(src)
    img.thumbnail((w, h), Image.Resampling.LANCZOS)
    dst = OUT / f'{src.stem}.webp'
    img.save(dst, 'WEBP', quality=q, method=6)
    total += dst.stat().st_size
    print(f'{dst.name:28} {img.size[0]}x{img.size[1]}  {dst.stat().st_size // 1024} KB')
print(f'total {total // 1024} KB')
