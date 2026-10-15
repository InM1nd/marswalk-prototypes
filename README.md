# Marswalk Prototypes

Interactive ad-tool demos for [marswalk.media](https://marswalk.media) — pitch suite for DACH performance / brand campaigns (FMCG, banking, travel, mobility).

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:4000** — hub at `/`, prototypes proxied under `/wheel`, `/scratch`, `/runner`, `/plinko`, `/catch`, `/advent`, `/yamaha-beats`.

```bash
npm run build   # → dist/ (single Vercel static project)
```

## Apps

| Path | App |
|------|-----|
| `/` | Hub — prototype cards + mini-game ideas backlog |
| `/wheel/` | Prize Wheel (multi-brand presets) |
| `/scratch/` | Scratch Card |
| `/scratch/lotto` | Scratch Lotto (match-3 grid) |
| `/runner/` | Mini Runner |
| `/plinko/` | 3D Plinko |
| `/catch/` | dm Glückskorb — Black Friday Catcher (SVG products, combo, lives, demo bonus) |
| `/advent/` | Advent Calendar (Next.js static export, Drei Austria pitch) |
| `/yamaha-beats/` | Groovebox studio (Yamaha Music Europe pitch) |
| `/yamaha-beats/mini/` | One-card sequencer for a product-page iframe |
| `/yamaha-beats/drums/` | Pocket drum machine: tap pads, record a loop |
| `/yamaha-beats/embed-demo.html` | Mock product page with Mini and Drums embedded |

Planned (not built): 3D Configurator, Personality Quiz.

## Docs

- [overview.md](overview.md) — business framing, comparative table, ROI
- [polish-plan.md](polish-plan.md) — polish checklist before management demo
- `prototype-*.md` — per-format build plans

## Architecture note

Each live demo is a Vite + React app. Config (TS) + assets drive branding; render engines (pixi / three) stay separate from UI. One monorepo → one Vercel project with path rewrites (`vercel.ts`).
