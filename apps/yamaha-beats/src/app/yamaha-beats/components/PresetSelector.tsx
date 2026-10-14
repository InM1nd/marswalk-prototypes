'use client';

import { Coffee, Disc3, Drum, Eraser, Flame, Piano, Sun, Sunset, Zap } from 'lucide-react';
import { PATCHES, STEPS, TRACKS, emptyPattern, type Pattern, type Sound } from '../lib/yamaha-audio-engine';

export interface Preset {
  id: string;
  name: string;
  bpm: number;
  swing: number;
  /** Voice patch index per track (into PATCHES). */
  patches: number[];
  sound: Sound;
  /** Active steps per track, in TRACKS order. */
  steps: number[][];
}

const range = (fn: (s: number) => number[]) => Array.from({ length: STEPS }, (_, s) => fn(s));
const half = <T,>(a: T, b: T) => (s: number) => (s < 8 ? a : b);
const AM7 = [57, 64, 67, 72];
const FMAJ7 = [53, 60, 64, 69];
const PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76];
const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];
const SIXTEENTHS = Array.from({ length: STEPS }, (_, s) => s);

// Patch indices: lead 0 E.Piano 1 Bells 2 Brass 3 Pluck 4 Marimba 5 Organ 6 Supersaw 7 Chip 8 Vox 9 Wobble 10 Zap | bass 0 Sub 1 Acid 2 Reese 3 808 4 Slap
//                snare 0 Snare 1 Clap 2 Rim 3 Lo-Fi | hat 0 Closed 1 Open 2 Shaker 3 Ride
// Order matters: the index is stored in shared links, so only append new presets.
export const PRESETS: Preset[] = [
  {
    // Boot state: empty grid, but a melodic kit so the first taps already sound musical.
    id: 'tokyo',
    name: 'TOKYO NIGHTS',
    bpm: 118,
    swing: 0.15,
    patches: [0, 0, 0, 0],
    sound: { lead: range((s) => [PENTA[(s * 3) % PENTA.length]]), bass: range((s) => [half(33, 29)(s)]).flat() },
    steps: [[], [], [], []],
  },
  {
    id: 'shibuya',
    name: 'SHIBUYA HOUSE',
    bpm: 124,
    swing: 0.15,
    patches: [0, 0, 1, 0],
    sound: { lead: range(half(AM7, FMAJ7)), bass: range((s) => [half(33, 29)(s) + (s === 14 ? 12 : 0)]).flat() },
    steps: [[3, 6, 11, 14], [0, 4, 8, 12, 14], [4, 12], [2, 6, 10, 14, 15]],
  },
  {
    id: 'synthwave',
    name: 'CYBER SYNTHWAVE',
    bpm: 110,
    swing: 0,
    patches: [6, 0, 0, 0],
    sound: {
      lead: range((s) => [half([64, 67, 71, 76], [60, 64, 67, 72])(s)[Math.floor(s / 2) % 4]]),
      bass: range((s) => [half(40, 36)(s) + (s % 4 === 2 ? 12 : 0)]).flat(),
    },
    steps: [EIGHTHS, EIGHTHS, [4, 12], [2, 6, 10, 14]],
  },
  {
    id: 'lofi',
    name: 'LO-FI CHILL',
    bpm: 90,
    swing: 0.3,
    patches: [0, 0, 3, 2],
    sound: { lead: range(half([50, 53, 57, 60, 64], [43, 53, 59, 62, 65])), bass: range((s) => [half(38, 31)(s)]).flat() },
    steps: [[0, 7, 10], [0, 3, 8, 11], [4, 12], EIGHTHS],
  },
  {
    id: 'techno',
    name: 'BERLIN TECHNO',
    bpm: 132,
    swing: 0,
    patches: [1, 3, 1, 1],
    sound: { lead: range((s) => [[69, 76, 72, 74][s % 4]]), bass: range(() => [33]).flat() },
    steps: [[3, 10], [0, 4, 8, 12], [4, 12], [2, 6, 10, 14]],
  },
  {
    id: 'trap',
    name: 'ATLANTA TRAP',
    bpm: 140,
    swing: 0,
    patches: [4, 3, 1, 0],
    sound: { lead: range((s) => [[72, 75, 79, 77, 75, 72, 70, 67][Math.floor(s / 2)]]), bass: range((s) => [half(36, 32)(s)]).flat() },
    steps: [[0, 3, 6, 8, 11, 14], [0, 7, 10], [8], [0, 2, 4, 6, 8, 10, 11, 12, 14, 15]],
  },
  {
    id: 'afro',
    name: 'AFRO HOUSE',
    bpm: 122,
    swing: 0.12,
    patches: [4, 0, 2, 2],
    sound: { lead: range((s) => [[65, 68, 70, 72, 75][s % 5]]), bass: range(() => [29]).flat() },
    steps: [[0, 3, 6, 10, 13], [0, 4, 7, 8, 12], [3, 7, 11, 14], SIXTEENTHS],
  },
  {
    id: 'citypop',
    name: 'CITY POP 1984',
    bpm: 112,
    swing: 0.1,
    patches: [0, 4, 0, 0],
    sound: { lead: range(half([53, 57, 60, 64], [52, 55, 59, 62])), bass: range((s) => [half(29, 28)(s) + (s % 2 ? 12 : 0)]).flat() },
    steps: [[0, 3, 6, 10, 12], [0, 2, 3, 6, 8, 10, 11, 14], [4, 12], EIGHTHS],
  },
  {
    id: 'reggaeton',
    name: 'REGGAETON',
    bpm: 96,
    swing: 0,
    patches: [3, 3, 0, 0],
    sound: { lead: range((s) => [[69, 72, 76, 72][Math.floor(s / 2) % 4]]), bass: range(() => [33]).flat() },
    steps: [[2, 6, 10, 14], [0, 4, 8, 12], [3, 6, 11, 14], EIGHTHS],
  },
];

// Dice: mutate a genre groove so it stays musical. Keep most of the genre's steps,
// sprinkle a few new ones (hats busiest, snare rarest), always keep a backbeat and a downbeat.
const ADD_CHANCE = [0.16, 0.12, 0.05, 0.32];
export function rollGroove(presetIdx: number) {
  const idx = PRESETS[presetIdx].steps.some((s) => s.length) ? presetIdx : 1 + Math.floor(Math.random() * (PRESETS.length - 1));
  const base = patternFrom(PRESETS[idx]);
  const pattern = base.map((row, tr) => row.map((on) => (on ? Math.random() < 0.8 : Math.random() < ADD_CHANCE[tr])));
  if (!pattern[2].some(Boolean)) [4, 12].forEach((s) => (pattern[2][s] = true));
  pattern[1][0] = true;
  // fresh lead voice every roll, mostly the genre's own kit elsewhere
  const patches = PRESETS[idx].patches.map((p, tr) =>
    tr === 0 || Math.random() < 0.3 ? Math.floor(Math.random() * PATCHES[tr].length) : p,
  );
  return { presetIdx: idx, pattern, patches };
}

export const patternFrom = (p: Preset): Pattern => {
  const grid = emptyPattern();
  p.steps.forEach((steps, tr) => steps.forEach((s) => (grid[tr][s] = true)));
  return grid;
};

// URL beat encoding, no backend: 4 hex chars per track (16 steps, MSB = step 1), BPM, preset kit,
// voice patch per track in base 36. e.g. ?groove=1248888a08080e6c-124-1-0010 (older links without patches still load).
export function encodeGroove(pattern: Pattern, bpm: number, presetIdx: number, patches: number[]) {
  const hex = pattern
    .map((row) => row.reduce((n, on, i) => n | (on ? 1 << (STEPS - 1 - i) : 0), 0).toString(16).padStart(4, '0'))
    .join('');
  return `${hex}-${Math.round(bpm)}-${presetIdx}-${patches.map((p) => p.toString(36)).join('')}`;
}

export function decodeGroove(code: string | null): { pattern: Pattern; bpm: number; presetIdx: number; patches: number[] } | null {
  const m = code?.match(/^([0-9a-f]{16})-(\d{2,3})-(\d)(?:-([0-9a-z]{4}))?$/i);
  if (!m) return null;
  const pattern = TRACKS.map((_, tr) => {
    const n = parseInt(m[1].slice(tr * 4, tr * 4 + 4), 16);
    return Array.from({ length: STEPS }, (_, i) => !!(n & (1 << (STEPS - 1 - i))));
  });
  const presetIdx = Number(m[3]) < PRESETS.length ? Number(m[3]) : 0;
  const patches = m[4] ? [...m[4]].map((d, tr) => (parseInt(d, 36) < PATCHES[tr].length ? parseInt(d, 36) : 0)) : PRESETS[presetIdx].patches;
  return { pattern, bpm: Math.min(150, Math.max(90, Number(m[2]))), presetIdx, patches };
}

const ICONS = { shibuya: Piano, synthwave: Zap, lofi: Coffee, techno: Disc3, trap: Flame, afro: Drum, citypop: Sunset, reggaeton: Sun } as const;
const LABELS: Record<keyof typeof ICONS, string> = {
  shibuya: 'Shibuya House', synthwave: 'Cyber Synthwave', lofi: 'Lo-Fi Chill', techno: 'Berlin Techno',
  trap: 'Atlanta Trap', afro: 'Afro House', citypop: 'City Pop 1984', reggaeton: 'Reggaeton',
};
const BUTTONS = [
  ...PRESETS.slice(1).map((p, i) => ({ label: LABELS[p.id as keyof typeof ICONS], sub: `${p.bpm} BPM`, icon: ICONS[p.id as keyof typeof ICONS], preset: i + 1 as number | null })),
  { label: 'Clean Slate', sub: 'Clear grid', icon: Eraser, preset: null },
];

export function PresetSelector({ active, hint, onPreset, onClear }: { active: string; hint: boolean; onPreset: (idx: number) => void; onClear: () => void }) {
  return (
    <div>
      <p className="silk mb-2 lg:hidden">Vibe starters</p>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:grid lg:grid-cols-9 lg:overflow-visible lg:pb-0">
        {BUTTONS.map(({ label, sub, icon: Icon, preset }) => {
          const on = preset !== null && PRESETS[preset].id === active;
          return (
            <button
              key={label}
              type="button"
              onClick={() => (preset === null ? onClear() : onPreset(preset))}
              className={`keycap group flex w-[132px] shrink-0 snap-start items-center gap-2 px-2.5 py-2.5 text-left lg:h-[54px] lg:w-auto lg:gap-1.5 lg:px-2 ${hint && preset !== null ? 'animate-[hint_2.4s_ease-in-out_infinite]' : ''}`}
            >
              <span className={`led ${on ? 'led-on' : ''}`} style={{ ['--c' as string]: '#FF5500' }} aria-hidden />
              <Icon size={16} className="shrink-0 text-white/60 group-hover:text-white lg:hidden" />
              <span className="min-w-0">
                <span className="block text-[12px] leading-tight font-semibold text-white/90 lg:text-[11px]">{label}</span>
                <span className="block font-mono text-[10px] text-white/40 lg:hidden">{sub}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
