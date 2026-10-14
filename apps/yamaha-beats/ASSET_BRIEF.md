# Yamaha Beat Studio: asset brief (image generation)

The groovebox itself needs **no generated art**: every sound is synthesized live
(Web Audio) and the hardware look is pure CSS. Bitmap textures or audio files would
only add weight inside Instagram/TikTok WebViews.

The one asset that pays off is the **link preview**. "Share My Beat" sends a URL to
friends; in WhatsApp, iMessage, Instagram DMs and Slack that URL unfurls into a card,
and without an image it shows as a bare link.

Output folder: `apps/yamaha-beats/public/` (create files at the paths below).

---

## 1. Share card (required): `og.jpg`, 1200×630, JPG, under 300 KB

A hero render of a **fictional** compact groovebox (model name "SQ-16", inspired by
the Yamaha SEQTRAK / MODX industrial design), shot like a premium product ad.

- **Device:** low, wide, matte dark anodized aluminium (`#111215`–`#1A1B20`) with
  subtle brushed texture, rounded bevelled edges, small screw heads in the corners.
  On top:
  - a 4×16 grid of soft silicone pads, some lit from beneath in purple `#9D4EDD`,
    cyan `#00F5D4`, orange `#FF5500` and emerald `#10B981`;
  - a small black glossy OLED showing a dot-matrix spectrum;
  - a square XY touch pad.
- **Camera:** three-quarter view from the front-left, slightly above, device fills
  ~60% of the frame, placed right of center. Shallow depth of field.
- **Light:** dark studio, one soft key light from above, a faint purple rim light,
  the lit pads cast a soft colored glow onto the surface. Background near-black
  `#0B0B0D` with a subtle purple-to-orange gradient haze on the right.
- **Left 40% of the frame:** calm and dark (headline text is overlaid there in code
  or added later). No text in the image itself.
- **Do NOT include:** the Yamaha logo or tuning-fork emblem (trademark; the real logo
  comes from the client), any other brand marks, people, hands, cables clutter,
  neon cyberpunk city backgrounds.

Prompt starting point:

> Premium product photography of a compact fictional groovebox synthesizer, matte
> dark anodized brushed aluminium chassis with rounded bevelled edges and small corner
> screws, 4 by 16 grid of soft silicone pads with some pads glowing from beneath in
> purple, cyan, orange and emerald, small glossy black OLED screen with a dot-matrix
> audio spectrum, square XY touch pad, three-quarter view from front-left slightly
> above, dark studio with one soft overhead key light and a faint purple rim light,
> colored pad glow reflecting on the surface, near-black background with subtle purple
> to orange haze on the right, empty dark space on the left third, shallow depth of
> field, photorealistic, no text, no logos

## 2. (Optional) Square post: `social-1080.jpg`, 1080×1080

Same device and lighting, top-down 3/4 crop on the glowing pad grid, for the
campaign's organic social posts. Same "no text, no logos" rules.

---

## Acceptance

- [ ] Exact file names and sizes as above.
- [ ] No text, letters, logos or real brand marks anywhere.
- [ ] Pad colors match the four hex values (they mirror the UI).
- [ ] Reads well as a small thumbnail (~300 px wide): device silhouette clear, glow visible.

After delivery: the share card gets wired into the page metadata (Open Graph +
Twitter card) so shared beat links unfurl with it.
