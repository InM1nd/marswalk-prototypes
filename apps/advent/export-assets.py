"""Export the generated originals at ASSET_BRIEF sizes; no lossy compression.

Run from any directory: python3 apps/advent/export-assets.py
Requires Pillow. The gift parts retain one shared 1024px coordinate system.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageOps, ImageChops

BASE = Path(__file__).resolve().parent
ORIGINALS = BASE / 'asset-originals'
# Full-resolution masters; optimize-assets.py turns them into the shipped WebPs in public/assets.
OUTPUT = BASE / 'asset-masters'
OUTPUT.mkdir(parents=True, exist_ok=True)
SIZES = {
    'door-06-nikolaus.webp': (1600, 800),
    'door-24-heiligabend.webp': (1600, 800),
    'bg-desktop.webp': (2400, 1500),
    'bg-mobile.webp': (1080, 1920),
    'scratch-foil.webp': (1200, 900),
    'hero.webp': (2000, 1400),
}

def load(name):
    return Image.open(ORIGINALS / name).convert('RGBA')

def polygon(points):
    mask = Image.new('L', (1024, 1024))
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask

def masked(image, mask):
    result = image.copy()
    result.putalpha(ImageChops.multiply(image.getchannel('A'), mask))
    return result

for original in sorted(ORIGINALS.glob('icon-*.png')):
    image = load(original.name)
    bounds = image.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    object_image = image.crop(bounds)
    object_image.thumbnail((736, 736), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (1024, 1024))
    canvas.alpha_composite(object_image, ((1024-object_image.width)//2,
                                        (1024-object_image.height)//2))
    canvas.save(OUTPUT / original.name)

for name, size in SIZES.items():
    image = load(Path(name).stem + '.png').convert('RGB')
    ImageOps.fit(image, size, method=Image.Resampling.LANCZOS).save(
        OUTPUT / name, 'WEBP', lossless=True)

closed = load('gift-closed.png').resize((1024, 1024), Image.Resampling.LANCZOS)
no_bow = load('gift-lid-under-bow.png').resize((1024, 1024), Image.Resampling.LANCZOS)
open_reference = load('gift-open-reference.png').resize((1024, 1024), Image.Resampling.LANCZOS)
# The generated cutouts have slightly translucent solid surfaces. Make those
# surfaces opaque while retaining genuinely soft, antialiased silhouette edges.
for image in [closed, no_bow, open_reference]:
    image.putalpha(image.getchannel('A').point(lambda v: 255 if v >= 240 else v))
# Follow the original lid/body seam, preserving the visible body pixels.
body_mask = polygon([(0, 481), (137, 518), (563, 640), (578, 644),
                     (592, 640), (896, 450), (1024, 410),
                     (1024, 1024), (0, 1024)])
lid_mask = ImageChops.invert(body_mask)
# Select the lime bow silhouette, excluding the fixed ribbon bands.
bow_region = polygon([(250, 340), (244, 278), (273, 223), (296, 216),
    (298, 177), (330, 146), (393, 118), (447, 111), (484, 145),
    (506, 192), (514, 233), (548, 234), (583, 176), (629, 149),
    (679, 147), (720, 175), (747, 223), (756, 271), (743, 320),
    (728, 345), (730, 376), (696, 406), (649, 419), (604, 407),
    (607, 464), (518, 472), (486, 380), (370, 440), (291, 419),
    (290, 400), (384, 368), (332, 380), (283, 370)])
bow_color = Image.new('L', closed.size)
bow_color.putdata([255 if (r > b*1.1 and g > b*1.1) or (r > 220 and g > 220) else 0
                   for r,g,b,a in closed.getdata()])
bow_mask = ImageChops.multiply(bow_region, bow_color)
bow = masked(closed, bow_mask)
lid = masked(closed, ImageChops.multiply(lid_mask, ImageChops.invert(bow_mask)))
# Export a complete surface behind the opaque bow so it can pop off cleanly.
opaque_bow = ImageChops.multiply(bow_mask,
    closed.getchannel('A').point(lambda v: 255 if v == 255 else 0))
lid = Image.alpha_composite(masked(no_bow, opaque_bow), lid)
body = masked(closed, body_mask)
# Reveal the generated hollow interior at the body rim, underneath the lid.
interior = Image.new('RGBA', (1024, 1024))
interior.alpha_composite(open_reference, (0, 125))
opaque_closed = closed.getchannel('A').point(lambda v: 255 if v == 255 else 0)
interior_mask = ImageChops.multiply(lid_mask, opaque_closed)
body = Image.alpha_composite(masked(interior, interior_mask), body)
for name, image in [('gift-body.png', body), ('gift-lid.png', lid), ('gift-bow.png', bow)]:
    image.save(OUTPUT / name)
glow = load('gift-glow.png').resize((700, 700), Image.Resampling.LANCZOS)
glow_canvas = Image.new('RGBA', (1024, 1024))
# The source flare origin is near (0.5, 0.77); anchor it inside the box opening.
glow_canvas.alpha_composite(glow, (162, 15))
glow_canvas.save(OUTPUT / 'gift-glow.png')

assembled = Image.alpha_composite(Image.alpha_composite(body, lid), bow)
assembled.save(ORIGINALS / 'gift-assembled.png')
for color in ['black', 'white']:
    background = Image.new('RGBA', closed.size, color)
    diff = ImageChops.difference(Image.alpha_composite(background, assembled),
                                Image.alpha_composite(background, closed))
    assert not diff.convert('RGB').getbbox(), 'Gift layers differ from closed reference'
expected = {p.name: (1024,1024) for p in OUTPUT.glob('icon-*.png')}
expected.update({name:(1024,1024) for name in ['gift-body.png','gift-lid.png','gift-bow.png','gift-glow.png']})
expected.update(SIZES)
assert len(expected) == 24
report = []
for name, size in sorted(expected.items()):
    image = Image.open(OUTPUT / name)
    assert image.size == size, name
    if name.endswith('.png'):
        assert image.mode == 'RGBA', name
        alpha_min, alpha_max = image.getchannel('A').getextrema()
        assert alpha_min == 0 and alpha_max > 0, name
    report.append({'file':name,'size':list(size),'mode':image.mode,'bytes':(OUTPUT/name).stat().st_size})
(ORIGINALS / 'validation.json').write_text(json.dumps({'gift_stack_pixel_identical':True,'assets':report},indent=2)+'\n')
print(f'Validated {len(report)} assets: sizes, PNG alpha, pixel-identical closed gift stack.')
