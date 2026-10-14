# Drei Adventskalender: asset brief (image generation)

Brief for generating the visual assets of the advent calendar prototype
(`apps/advent`). Code integration happens separately, so assets only need to
match the specs below (names, sizes, transparency).

Output folder: `apps/advent/public/assets/` (create it). Formats: PNG with alpha
for objects, WebP for backgrounds. Keep the originals; no manual compression.

---

## 1. Style: "Drei Christmas, soft 3D"

Reference: the current visual language of https://www.drei.at. Bright, daylight,
optimistic; sky gradients, glossy rounded objects, rounded-diamond badges. NOT
dark, NOT neon, NOT vintage/gold/luxury.

**Render look (shared by ALL assets):**
- Soft 3D render, Blender/Octane look, rounded bevelled shapes, slightly toy-like
  but premium (Apple-emoji-3D / "clay + glossy plastic" mix).
- Soft studio light from top-left, gentle ambient occlusion, a short soft contact
  shadow below objects. No hard black shadows.
- Camera: front 3/4 view, ~25° from above, the same for every object.
- Materials: glossy plastic + matte clay; snow = soft white matte; small
  frosted-glass details are fine.
- Clean, no text, no logos, no numbers, no real brand marks (no Apple/Samsung
  logos on devices). Do not draw the Drei "3" logo; it is added in code.

**Palette (strict, sampled from drei.at):**

| Role | Hex |
|---|---|
| Drei cyan (primary) | `#00A0D2` |
| Deep teal | `#00779D` |
| Navy (text, dark parts) | `#0F273B` |
| Lime (accent, ribbons, highlights) | `#DDEE3D` |
| Purple (secondary accent) | `#71439D` |
| Ice background | `#F2FAFD` / `#DDE9EF` |
| Snow | `#FFFFFF` |

Christmas comes from motifs (snow, gifts, fir, stars, ornaments), not from
red/green/gold. Small amounts of warm white light are fine. No red.

**Prompt prefix (use for every object prompt):**

> Soft 3D render, Blender style, glossy plastic and matte clay materials,
> rounded bevelled edges, soft studio lighting from top-left, subtle ambient
> occlusion, soft contact shadow, front three-quarter view slightly from above,
> centered, isolated on transparent background, color palette cyan #00A0D2,
> deep teal #00779D, navy #0F273B, lime #DDEE3D, purple #71439D, white snow,
> playful premium telecom brand style, Christmas mood, no text, no logos

---

## 2. Asset list

### A. Prize icons: 14 objects, transparent PNG, 1024×1024
Shown inside each opened door and in the reward modal. One object per image,
centered, filling ~70% of the canvas, same scale and angle across the set.
A light dusting of snow or a tiny lime ribbon on each object ties them together.

| File | Object |
|---|---|
| `icon-data.png` | Glossy cyan 5G signal waves / data bubble with small snowflakes |
| `icon-headphones.png` | Over-ear headphones, navy + cyan cushions |
| `icon-music.png` | Chunky music note, cyan with lime highlight |
| `icon-plane.png` | Cute rounded plane + small suitcase (EU roaming) |
| `icon-giftcard.png` | Gift card with lime ribbon, tilted |
| `icon-smartwatch.png` | Smartwatch, purple strap, blank glowing screen |
| `icon-smartphone.png` | Generic modern smartphone, blank cyan-gradient screen |
| `icon-sim.png` | SIM / eSIM chip card, cyan with lime contacts |
| `icon-powerbank.png` | Powerbank with tiny lightning glyph, lime accent |
| `icon-coins.png` | Stack of 3 coins + small star (a free month) |
| `icon-cloud.png` | Puffy cloud with small upload arrow, white + cyan |
| `icon-delivery.png` | Delivery parcel with a lime ribbon and a small motion swoosh |
| `icon-tablet.png` | Tablet, blank screen, navy frame |
| `icon-router.png` | Home 5G router, white with cyan light |

### B. Special door covers: 2 images, WebP, 1600×800 (2:1)
Full-bleed illustration on a light sky gradient (`#F2FAFD` to `#00A0D2`),
same 3D style. Keep the bottom-left third calm and mid-toned: a big white
number and a lime script label are overlaid there in code. A purple-to-teal
feel matches the surrounding doors.

| File | Content |
|---|---|
| `door-06-nikolaus.webp` | Nikolaus boot (purple, white fur trim) overflowing with small wrapped gifts in cyan/lime, snow on the ground, a few floating snowflakes |
| `door-24-heiligabend.webp` | Stylised fir tree in deep teal with lime + cyan + purple baubles and a glowing white star, a pile of gifts below, soft falling snow |

### C. Gift unwrap layers: 4 transparent PNGs, 1024×1024, SAME camera + scale
These are animated in code (shake, bow pops off, lid flies off, light bursts
out), so the parts must align pixel-perfectly when stacked. Render once as a
full scene, then export each part on its own layer.

| File | Content |
|---|---|
| `gift-body.png` | Purple gift box body (no lid), lime ribbon vertical band |
| `gift-lid.png` | Matching lid, lime ribbon band, positioned exactly on top of the body |
| `gift-bow.png` | Big glossy lime bow, positioned exactly on the lid |
| `gift-glow.png` | Soft white-cyan light rays bursting upward from the open box (additive glow, transparent) |

### D. Calendar background: WebP, 2400×1500 (desktop) + 1080×1920 (mobile)
`bg-desktop.webp`, `bg-mobile.webp`. A very calm snowy landscape in the same 3D style:
- an ice-blue sky gradient;
- soft rounded snow hills at the bottom;
- a few deep-teal stylised firs at the edges;
- tiny floating snowflakes.

Low contrast and lots of empty space: UI sits on top. Brightness similar to the
drei.at hero banners (light, airy).

### E. Scratch-card foil: WebP, 1200×900
`scratch-foil.webp`. Holographic iridescent foil texture shifting through cyan,
lime, purple and silver, with fine sparkles and subtle snowflake emboss.
Flat, top-down, no perspective, no text.

### F. (Optional) Hero key visual: WebP, 2000×1400
`hero.webp`. Floating composition: 3–5 gift boxes (cyan/purple/lime), a smartphone
showing snowfall on its blank screen, snowflakes and stars, on a light sky gradient.
Leave the left 45% empty for the headline.

---

## 3. Acceptance checklist

- [ ] All objects share one light direction, camera angle and material look (place the icons side by side and check they read as one set).
- [ ] Palette only from the table above; no red/green/gold "classic Christmas".
- [ ] No text, letters, numbers, logos anywhere.
- [ ] Transparent PNGs have clean alpha edges (no white halo).
- [ ] Gift layers (C) stack to a perfect closed box when overlaid at 0,0.
- [ ] File names exactly as listed.

## 4. Not needed

- Real 3D models (GLB/three.js): pre-rendered layers give the same look at a
  fraction of the weight; Instagram/TikTok WebViews struggle with WebGL.
- Snow particles, confetti, badges, buttons, numbers: drawn in code.
