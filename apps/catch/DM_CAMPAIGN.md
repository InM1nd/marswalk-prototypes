# dm Glückskorb — Black Friday concept

The existing `/catch/` prototype is now a German-language dm Austria campaign.
Pixi's renderer and the original mouse, relative touch-drag and keyboard input
remain in use. No bitmap product assets or extra dependencies were added.

## Design direction

The user brief owns the navy canvas, magenta actions/hearts, cyan highlights,
gold rewards and Black Friday mood. [dm.at](https://www.dm.at/) informed the
own-brand product hierarchy and PAYBACK vocabulary. The Refero craft guide
informed visible focus, labeled email/consent fields, mobile hit targets,
reduced motion, and non-scrolling game input.

Desktop pairs campaign copy with a phone-shaped game. On mobile the game fills
the viewport, with a slim marswalk presenter bar above it. Product art is
procedural, glossy SVG with shared lighting, not external product photography.

## Assets and rules

- `src/components/assets/DmAssets.tsx`: SVG factory, DOM component, SVG data URL,
  and async HTMLImageElement helper. The engine uses the existing retina-aware
  `svgTexture` helper to load these into Pixi.
- Basket back and front share their origin at the open mouth. Products sink
  behind the front wall after a catch. A squash/stretch effect marks impacts.
- Balea +10, alverde +15, ebelin +20, rare gold coupon +50.
- Five consecutive good catches activate 2× scoring, a magenta rim, faster
  synthesized music and larger particle bursts. Missing a good drop or catching
  a hazard resets the streak.
- Bombs remove one of three lives. Cardboard slows movement for 2.5 seconds.
  God Mode prevents both effects and persists when restarting a round.
- 250 points immediately opens the win flow. At 30-second time up, at least
  150 points qualify. Losing all lives ends the round without a bonus.
- Instant Win opens the same claim flow without playing.
- Email and required consent gate a copyable `DM-BLACK-15` code. This is a
  frontend concept only: no email transmission, persistence or real coupon.

## Verification

```sh
cd apps/catch
npm ci
npm run dev -- --port 5195 --strictPort
npm run build
npm run lint
npm test
```

Six unit tests cover combo boundaries, life loss, timed prize qualification,
God Mode, slowdown expiry and seeded spawn fairness. Browser checks exercised
mouse, touch and keyboard movement; actual engine collision handling for all
item types; target and time-up win/loss; Instant Win; native form validation;
consent; clipboard; and retry. Responsive checks passed at 1280×800, 390×844,
and 375×667 without horizontal overflow or broken images.

Vite reports a >500 kB main chunk warning from the existing Pixi renderer stack;
the production build completes successfully.
