# Prize Wheel — 1-minute demo script

For management pitch (desktop + phone on public URL).

## Beat

1. **Hub** → open Prize Wheel.
2. Show **FMCG** wheel (rim, logo hub, brand wash). Spin once → prize → Claim → email + GDPR → success shows `Lead captured · fmcg-demo · time`. Mention DevTools filter `[analytics]`.
3. **Reset demo session** (banner) → switch preset to **Banking** (or open `/wheel/?campaign=bank-demo`). Point out colors/logo/copy changed without code.
4. Optional: open Customize → show segment **weights %** and live recolor.
5. Close: “One engine — config + assets per client.”

## Device QA checklist

- [ ] Desktop Chrome: spin smooth, confetti on win, no console errors
- [ ] iPhone Safari: spin works; sound unlocks on Spin click (Sound on)
- [ ] Android Chrome: same
- [ ] Anti-replay banner appears after first spin; Reset clears it
- [ ] `?campaign=travel-demo` deep-link loads Travel preset

## Analytics without GA

No `VITE_GA_MEASUREMENT_ID` needed for the pitch — events log as `console.info('[analytics]', …)`.
