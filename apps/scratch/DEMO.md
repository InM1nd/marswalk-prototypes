# Scratch Card — 1-minute demo script

## Classic scratch (`/scratch/`)

1. Hub → Scratch Card.
2. Show the metallic foil card. Scratch with sparkles → glowing prize ticket (holds ~1s) → result modal → Claim → GDPR lead → success pipeline line.
3. DevTools filter `[analytics]` (`scratch_view`, `scratch_start`, `scratch_result`, `lead_*`).
4. **1 play used · Reset** (chip in the top demo bar) → switch to **Banking** (or `?campaign=bank-demo`). Point out font/foil tint/copy change.
5. Optional: **⚙ Customize** (drawer) → prize weights % and live recolor.
6. Optional: **Styles** → nine style directions for the same mechanic.

## Lotto (`/scratch/lotto`)

1. **Match-3** in the demo bar (keeps the current vertical).
2. Scratch tiles (soft foil + sparkles) → match highlight → lead.
3. Switch FMCG / Banking / Travel presets.

## Device QA

- [ ] Desktop: soft scratch edges, sparkles, confetti on win
- [ ] iPhone Safari: unlock sound on first scratch gesture
- [ ] Anti-replay chip (“1 play used · Reset”) in the demo bar + reset
- [ ] Deep-links `?campaign=bank-demo` / `?campaign=bank-lotto-demo`
