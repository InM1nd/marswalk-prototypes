'use client';

// Pocket drum machine for a product page, voiced like an 80s PCM drum machine (synthesized).
// Pick a beat from the list, tap the eight pads, hit REC to loop what you play. Under the pads:
// knobs, five sound sets for the pads, and eight A-minor melody loops that play under the beat.
// Taps are quantized to 16th notes of a one-bar loop and replayed on the engine's audio clock.
// Same embed rules as /mini: one card, no fixed bars, no full-screen modals.

import { Check, ChevronDown, Eraser, ExternalLink, Metronome, Play, Share2, Square, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HardwareChassis, OledDisplay } from '../yamaha-beats/components/HardwareChassis';
import { VersionNav } from '../yamaha-beats/components/VersionNav';
import { Knob } from '../yamaha-beats/components/Knobs';
import { copyText } from '../yamaha-beats/lib/copyText';
import {
  BASS_PATCHES, CLASSIC_KIT, DEFAULT_MIX, LEAD_PATCHES, STEPS, YamahaAudioEngine, cutoffFromNorm,
  type BassPatch, type LeadPatch, type RxKit, type RxName,
} from '../yamaha-beats/lib/yamaha-audio-engine';

const PRODUCT_URL = 'https://europe.yamaha.com/de/';
const BPM_MIN = 70;
const BPM_MAX = 180;

interface Pad {
  label: string;
  color: string;
  voice: RxName;
}

// Eight classic drum-machine voices, same layout in every beat: kick, snare, clap, rim / closed hat, open hat, tom, cowbell.
const PADS: Pad[] = [
  { label: 'KICK', color: '#FF5500', voice: 'kick' },
  { label: 'SNARE', color: '#00F5D4', voice: 'snare' },
  { label: 'CLAP', color: '#FF4D9D', voice: 'clap' },
  { label: 'RIM', color: '#4D8DFF', voice: 'rim' },
  { label: 'C.HAT', color: '#10B981', voice: 'chat' },
  { label: 'O.HAT', color: '#F5B700', voice: 'ohat' },
  { label: 'TOM', color: '#9D4EDD', voice: 'tom' },
  { label: 'COWBELL', color: '#D6B8F5', voice: 'cow' },
];
const PAD_COUNT = PADS.length;

// ---- sound sets: the same 8 pads, re-tuned
interface Kit extends RxKit {
  name: string;
  hint: string;
  /** Default bit-crush amount (0..1) when the set is chosen. */
  crush: number;
}
const KITS: Kit[] = [
  { name: 'Classic', hint: '12-Bit Standard', ...CLASSIC_KIT, crush: 0.3 },
  { name: '808', hint: 'Lange Bassdrum', kickTune: 0.85, kickDecay: 2.6, snareTune: 0.9, snareSnap: 0.8, hatDecay: 0.8, tomTune: 0.8, crush: 0.1 },
  { name: '909', hint: 'Hart, Club', kickTune: 1.15, kickDecay: 0.7, snareTune: 1.12, snareSnap: 1.5, hatDecay: 1.25, tomTune: 1.25, crush: 0.12 },
  { name: 'Lo-Fi', hint: 'Staubig, dumpf', kickTune: 0.95, kickDecay: 1.1, snareTune: 0.8, snareSnap: 0.6, hatDecay: 0.7, tomTune: 0.85, crush: 0.55 },
  { name: 'Studio', hint: 'Sauber, offen', kickTune: 1, kickDecay: 1.3, snareTune: 0.95, snareSnap: 1.2, hatDecay: 1.6, tomTune: 0.9, crush: 0 },
];

// ---- melodies: 2 bars (32 steps) in A minor, so any melody fits any beat
type Step = number | number[] | null;
interface Melody {
  name: string;
  hint: string;
  kind: 'lead' | 'bass';
  patch: LeadPatch | BassPatch;
  vel: number;
  steps: Step[];
}
const ROOTS = [45, 41, 48, 43]; // Am F C G, bass octave
const TRIADS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]];
const SEVENTHS = [[57, 60, 64, 67], [53, 57, 60, 64], [60, 64, 67, 71], [55, 59, 62, 65]];

/** Four chords of 8 steps each; fn returns [offset in the block, note(s)]. */
const blocks = (fn: (b: number) => [number, Step][]): Step[] => {
  const out: Step[] = Array(32).fill(null);
  for (let b = 0; b < 4; b++) for (const [o, n] of fn(b)) out[b * 8 + o] = n;
  return out;
};
const phrase = (pairs: [number, number][]): Step[] => {
  const out: Step[] = Array(32).fill(null);
  for (const [s, n] of pairs) out[s] = n;
  return out;
};

const MELODIES: Melody[] = [
  { name: 'Acid', hint: '303-Linie', kind: 'bass', patch: BASS_PATCHES[1], vel: 1.1, steps: blocks((b) => [[0, ROOTS[b]], [2, ROOTS[b]], [3, ROOTS[b] + 12], [5, ROOTS[b]], [7, ROOTS[b] + 12]]) },
  { name: 'Funk', hint: 'Slap-Bass', kind: 'bass', patch: BASS_PATCHES[4], vel: 1.15, steps: blocks((b) => [[0, ROOTS[b]], [3, ROOTS[b]], [4, ROOTS[b] + 12], [6, ROOTS[b]], [7, ROOTS[b] + 7]]) },
  { name: 'Sub', hint: '808-Bass', kind: 'bass', patch: BASS_PATCHES[3], vel: 1.15, steps: blocks((b) => [[0, ROOTS[b]], [5, ROOTS[b]]]) },
  { name: 'Disco', hint: 'Oktav-Bass', kind: 'bass', patch: BASS_PATCHES[0], vel: 1.1, steps: blocks((b) => [0, 1, 2, 3, 4, 5, 6, 7].map((i): [number, Step] => [i, ROOTS[b] + (i % 2 ? 12 : 0)])) },
  {
    name: 'Arp', hint: 'Synth-Arpeggio', kind: 'lead', patch: LEAD_PATCHES[3], vel: 2.2,
    steps: blocks((b) => [0, 1, 2, 3, 2, 1, 2, 1].map((idx, i): [number, Step] => [i, [...TRIADS[b], TRIADS[b][0] + 12][idx]])),
  },
  { name: 'Keys', hint: 'E-Piano-Akkorde', kind: 'lead', patch: LEAD_PATCHES[0], vel: 1.6, steps: blocks((b) => [[0, SEVENTHS[b]], [3, SEVENTHS[b]], [6, SEVENTHS[b]]]) },
  { name: 'Pad', hint: 'Chor-Flächen', kind: 'lead', patch: LEAD_PATCHES[8], vel: 4.5, steps: blocks((b) => [[0, TRIADS[b]]]) },
  {
    name: 'Bells', hint: 'Glocken-Hook', kind: 'lead', patch: LEAD_PATCHES[1], vel: 2.6,
    steps: phrase([[0, 76], [3, 72], [6, 69], [8, 72], [11, 74], [14, 72], [16, 76], [19, 79], [22, 76], [24, 74], [27, 72], [30, 69]]),
  },
];
const NO_MELODY = MELODIES.length;

// ---- beats: starter loops, steps per pad in PADS order
interface Beat {
  name: string;
  bpm: number;
  swing: number;
  kit: number;
  melody: number;
  groove: number[][];
}
const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];
const OFFBEATS = [1, 3, 5, 7, 9, 11, 13, 15];
const BEATS: Beat[] = [
  { name: 'Disco', bpm: 118, swing: 0, kit: 0, melody: 3, groove: [[0, 4, 8, 12], [4, 12], [4, 12], [], [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15], [2, 6, 10, 14], [15], [7]] },
  { name: 'Hip-Hop', bpm: 92, swing: 0.25, kit: 3, melody: 5, groove: [[0, 2, 7, 10], [4, 12], [], [7, 15], EIGHTHS, [14], [], []] },
  { name: 'Electro', bpm: 125, swing: 0, kit: 1, melody: 0, groove: [[0, 3, 8, 10], [4, 12], [12], [], EIGHTHS, [6, 14], [11, 13], [2, 10]] },
  { name: 'Pop 84', bpm: 108, swing: 0, kit: 0, melody: 7, groove: [[0, 2, 8, 10], [4, 12], [], [], EIGHTHS, [14], [14, 15], []] },
  { name: 'House', bpm: 124, swing: 0.1, kit: 2, melody: 4, groove: [[0, 4, 8, 12], [], [4, 12], [], OFFBEATS, [2, 6, 10, 14], [], []] },
  { name: 'Techno', bpm: 132, swing: 0, kit: 2, melody: 0, groove: [[0, 4, 8, 12], [], [4, 12], [6, 14], OFFBEATS, [2, 6, 10, 14], [15], []] },
  { name: 'Trap', bpm: 140, swing: 0, kit: 1, melody: 2, groove: [[0, 3, 6, 10], [8], [8], [], [0, 2, 4, 6, 8, 10, 11, 12, 14, 15], [14], [], []] },
  { name: 'Funk', bpm: 104, swing: 0.2, kit: 4, melody: 1, groove: [[0, 2, 6, 10, 13], [4, 12], [], [7, 15], EIGHTHS, [11], [], [3, 11]] },
  { name: 'Reggaeton', bpm: 96, swing: 0, kit: 4, melody: 7, groove: [[0, 4, 8, 12], [3, 6, 11, 14], [], [3, 6, 11, 14], EIGHTHS, [], [], []] },
  { name: 'Drum & Bass', bpm: 172, swing: 0, kit: 2, melody: 2, groove: [[0, 10], [4, 12], [], [15], EIGHTHS, [14], [], []] },
  { name: 'Breakbeat', bpm: 130, swing: 0, kit: 0, melody: 0, groove: [[0, 6, 10], [4, 12], [], [14], EIGHTHS, [15], [11], []] },
  { name: 'Lo-Fi', bpm: 80, swing: 0.3, kit: 3, melody: 6, groove: [[0, 7, 10], [4, 12], [], [11], EIGHTHS, [], [], []] },
];

type Hits = boolean[][]; // [pad][step]
const emptyHits = (): Hits => Array.from({ length: PAD_COUNT }, () => Array<boolean>(STEPS).fill(false));
const fromGroove = (g: number[][]): Hits => g.map((steps) => Array.from({ length: STEPS }, (_, s) => steps.includes(s)));

// ?d=<beat>-<bpm>-<8 x 4 hex chars>[-<kit>-<melody>], one 16-bit mask per pad (MSB = step 1)
const encode = (beat: number, bpm: number, h: Hits, kit: number, melody: number) =>
  `${beat}-${bpm}-${h.map((row) => row.reduce((n, on, i) => n | (on ? 1 << (STEPS - 1 - i) : 0), 0).toString(16).padStart(4, '0')).join('')}-${kit}-${melody}`;
const decode = (code: string | null) => {
  const m = code?.match(/^(\d{1,2})-(\d{2,3})-([0-9a-f]{32})(?:-(\d)-(\d))?$/i);
  if (!m || Number(m[1]) >= BEATS.length) return null;
  const hits = Array.from({ length: PAD_COUNT }, (_, p) => {
    const n = parseInt(m[3].slice(p * 4, p * 4 + 4), 16);
    return Array.from({ length: STEPS }, (_, i) => !!(n & (1 << (STEPS - 1 - i))));
  });
  const kit = Number(m[4] ?? BEATS[Number(m[1])].kit);
  const melody = Number(m[5] ?? BEATS[Number(m[1])].melody);
  return {
    beat: Number(m[1]),
    bpm: Math.min(BPM_MAX, Math.max(BPM_MIN, Number(m[2]))),
    hits,
    kit: kit < KITS.length ? kit : 0,
    melody: melody <= NO_MELODY ? melody : NO_MELODY,
  };
};

type Tab = 'knobs' | 'sounds' | 'melody';
const TABS: { id: Tab; label: string }[] = [
  { id: 'knobs', label: 'Regler' },
  { id: 'sounds', label: 'Sounds' },
  { id: 'melody', label: 'Melodie' },
];

export default function DrumMachine() {
  const engine = useMemo(() => new YamahaAudioEngine(), []);
  const [beatIdx, setBeatIdx] = useState(0);
  const [kitIdx, setKitIdx] = useState(BEATS[0].kit);
  const [melodyIdx, setMelodyIdx] = useState(BEATS[0].melody);
  const [bpm, setBpm] = useState(BEATS[0].bpm);
  const [swing, setSwing] = useState(BEATS[0].swing);
  const [filt, setFilt] = useState(1);
  const [crush, setCrush] = useState(KITS[BEATS[0].kit].crush);
  const [hits, setHits] = useState<Hits>(emptyHits);
  const [playing, setPlaying] = useState(false);
  const [rec, setRec] = useState(false);
  const [metro, setMetro] = useState(false);
  const [step, setStep] = useState(-1);
  const [lit, setLit] = useState<number[]>(() => Array(PAD_COUNT).fill(0));
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>('knobs');
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // refs mirror state for the audio-clock callbacks and pointer handlers
  const hitsRef = useRef(hits);
  const recRef = useRef(false);
  const metroRef = useRef(false);
  const melodyRef = useRef(melodyIdx);
  const bar = useRef(0); // which of the melody's two bars is sounding
  const fresh = useRef(true); // next step 0 is the first of a run
  const lastTaps = useRef<[number, number][]>([]); // [pad, step] in recording order, for UNDO

  const beat = BEATS[beatIdx];
  const kit = KITS[kitIdx];

  const commit = useCallback((next: Hits) => {
    hitsRef.current = next;
    setHits(next);
  }, []);

  useEffect(() => {
    engine.bpm = bpm;
    engine.swing = swing;
  }, [engine, bpm, swing]);
  useEffect(() => {
    engine.rxKit = KITS[kitIdx];
  }, [engine, kitIdx]);
  useEffect(() => {
    metroRef.current = metro;
  }, [metro]);
  useEffect(() => {
    melodyRef.current = melodyIdx;
  }, [melodyIdx]);
  useEffect(() => engine.setCutoff(cutoffFromNorm(filt)), [engine, filt]);
  useEffect(() => engine.setMix({ ...DEFAULT_MIX, echo: 0.12, space: 0.08, crush, level: 0.62 }), [engine, crush]);

  const flash = useCallback((pad: number) => {
    setLit((l) => l.map((v, i) => (i === pad ? v + 1 : v)));
    setTimeout(() => setLit((l) => l.map((v, i) => (i === pad ? Math.max(0, v - 1) : v))), 130);
  }, []);

  useEffect(() => {
    // the engine sequences nothing itself; every sound comes from the hook below
    engine.onSchedule = (s, t) => {
      if (s === 0) {
        bar.current = fresh.current ? 0 : 1 - bar.current;
        fresh.current = false;
      }
      if (metroRef.current && s % 4 === 0) engine.click(t, s === 0);
      const m = MELODIES[melodyRef.current];
      const note = m?.steps[bar.current * STEPS + s];
      if (m && note != null) engine.playAt(m.kind, m.patch, t, m.vel, note);
      hitsRef.current.forEach((row, p) => row[s] && engine.playAt('rx', PADS[p].voice, t, 0.95));
    };
    engine.onStep = (s) => {
      setStep(s);
      if (s >= 0) hitsRef.current.forEach((row, p) => row[s] && flash(p));
    };
    return () => engine.stop();
  }, [engine, flash]);

  // shared link
  useEffect(() => {
    const shared = decode(new URLSearchParams(window.location.search).get('d'));
    if (!shared) return;
    setBeatIdx(shared.beat);
    setBpm(shared.bpm);
    setSwing(BEATS[shared.beat].swing);
    setKitIdx(shared.kit);
    setCrush(KITS[shared.kit].crush);
    setMelodyIdx(shared.melody);
    commit(shared.hits);
  }, [commit]);

  // close the beat list on outside tap or Escape
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  const play = useCallback(async () => {
    fresh.current = true;
    await engine.start();
    setPlaying(true);
  }, [engine]);

  const stopAll = useCallback(() => {
    engine.stop();
    setPlaying(false);
    recRef.current = false;
    setRec(false);
  }, [engine]);

  const togglePlay = () => (engine.playing ? stopAll() : play());

  const toggleRec = async () => {
    if (recRef.current) {
      recRef.current = false;
      setRec(false);
      return;
    }
    recRef.current = true;
    setRec(true);
    lastTaps.current = [];
    if (!engine.playing) await play();
  };

  const audition = (pad: number, vel: number) => {
    engine.hit('rx', PADS[pad].voice, vel);
    flash(pad);
  };

  const tap = (pad: number, vel: number) => {
    audition(pad, vel);
    navigator.vibrate?.(8);
    if (!recRef.current || engine.position < 0) return;
    const s = Math.round(engine.position) % STEPS; // nearest 16th
    if (hitsRef.current[pad][s]) return;
    commit(hitsRef.current.map((row, p) => (p === pad ? row.map((on, i) => on || i === s) : row)));
    lastTaps.current.push([pad, s]);
  };

  const toggleCell = (pad: number, s: number) => {
    const on = !hitsRef.current[pad][s];
    commit(hitsRef.current.map((row, p) => (p === pad ? row.map((v, i) => (i === s ? on : v)) : row)));
    if (on) audition(pad, 0.8); // never records
  };

  const undo = () => {
    const last = lastTaps.current.pop();
    if (!last) return;
    commit(hitsRef.current.map((row, p) => (p === last[0] ? row.map((v, i) => (i === last[1] ? false : v)) : row)));
  };

  const clear = () => {
    lastTaps.current = [];
    commit(emptyHits());
  };

  // choosing a beat loads its drums, sound set and melody and starts playing, ready to play over
  const pickBeat = (i: number) => {
    setMenu(false);
    setBeatIdx(i);
    setBpm(BEATS[i].bpm);
    setSwing(BEATS[i].swing);
    setKitIdx(BEATS[i].kit);
    setCrush(KITS[BEATS[i].kit].crush);
    setMelodyIdx(BEATS[i].melody);
    lastTaps.current = [];
    commit(fromGroove(BEATS[i].groove));
    if (!engine.playing) play();
  };

  const pickKit = (i: number) => {
    engine.rxKit = KITS[i]; // before the effect runs, so the preview already uses it
    setKitIdx(i);
    setCrush(KITS[i].crush);
    audition(0, 0.9);
    setTimeout(() => audition(1, 0.9), 220);
  };

  const pickMelody = (i: number) => {
    setMelodyIdx(i);
    if (i !== NO_MELODY && !engine.playing) play();
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.search = `?d=${encode(beatIdx, bpm, hits, kitIdx, melodyIdx)}`;
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: 'Mein Beat', url: url.toString() }).catch(() => {});
    } else if (await copyText(url.toString())) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const empty = !hits.some((r) => r.some(Boolean));
  const chip = (on: boolean) => `keycap flex items-center gap-1.5 px-2 py-2 text-left text-[12.5px] font-semibold ${on ? 'text-white' : 'text-white/55'}`;

  return (
    <>
    <VersionNav sticky />
    <main className="mx-auto max-w-[520px] p-3 sm:p-5">
      <HardwareChassis>
        <div className="grid gap-3">
          <OledDisplay engine={engine} bpm={bpm} swing={swing} preset={`${beat.name} · ${kit.name}`.toUpperCase()} step={step} cutoff={cutoffFromNorm(filt)} drive={0} fx={rec ? '● REC' : null} mini />

          {/* beat list */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              className={`keycap flex w-full items-center gap-3 px-4 py-2.5 text-left ${empty && !playing ? 'animate-[hint_2.4s_ease-in-out_infinite]' : ''}`}
            >
              <span className="led led-on" style={{ ['--c' as string]: '#FF5500' }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="silk block">Beat wählen</span>
                <span className="block truncate text-[16px] leading-tight font-bold text-white">{beat.name}</span>
              </span>
              <span className="font-mono text-[11px] text-white/50">{bpm} BPM</span>
              <ChevronDown size={18} className={`text-white/60 transition-transform ${menu ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {menu && (
              <ul role="listbox" aria-label="Beat" className="chassis absolute inset-x-0 top-full z-30 mt-2 grid max-h-[300px] grid-cols-2 gap-1.5 overflow-y-auto rounded-2xl p-2 shadow-2xl">
                {BEATS.map((b, i) => (
                  <li key={b.name} role="presentation">
                    <button type="button" role="option" aria-selected={beatIdx === i} onClick={() => pickBeat(i)} className={`${chip(beatIdx === i)} w-full justify-between`}>
                      <span className="flex items-center gap-1.5">
                        <span className={`led ${beatIdx === i ? 'led-on' : ''}`} style={{ ['--c' as string]: '#FF5500' }} aria-hidden />
                        {b.name}
                      </span>
                      <span className="font-mono text-[10px] font-normal text-white/40">{b.bpm}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <section className="grid grid-cols-4 gap-2" aria-label="Drum-Pads">
            {PADS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                aria-label={`${p.label} spielen`}
                onPointerDown={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  tap(i, 0.55 + 0.45 * (1 - (e.clientY - r.top) / r.height)); // higher on the pad = harder hit
                }}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && (e.preventDefault(), tap(i, 0.9))}
                data-on={lit[i] > 0}
                data-head={lit[i] > 0}
                style={{ ['--c' as string]: p.color }}
                className="pad relative aspect-[5/4] w-full touch-manipulation rounded-2xl! select-none sm:aspect-[3/2]"
              >
                <span className="absolute inset-x-3 bottom-2.5 h-1 rounded-full opacity-70" style={{ background: p.color }} aria-hidden />
                <span className={`absolute inset-x-0 top-2.5 text-center font-mono text-[10.5px] font-semibold ${lit[i] > 0 ? 'text-black/70' : 'text-white/70'}`} aria-hidden>
                  {p.label}
                </span>
              </button>
            ))}
          </section>

          {/* loop roll: what is recorded; tap a cell to add or remove a hit */}
          <section className="well rounded-xl p-2" aria-label="Aufgenommene Schläge">
            <div className="grid gap-[3px]">
              {PADS.map((p, pi) => (
                <div key={p.label} className="grid grid-cols-16 gap-[3px]" style={{ ['--c' as string]: p.color }}>
                  {hits[pi].map((on, s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleCell(pi, s)}
                      aria-pressed={on}
                      aria-label={`${p.label} Schritt ${s + 1}`}
                      data-on={on}
                      data-head={s === step}
                      className={`pad h-[11px] w-full touch-manipulation rounded-[3px]! ${s % 4 === 0 && !on ? 'bg-[#2a2c34]!' : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleRec}
              aria-pressed={rec}
              className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-white ${rec ? 'bg-[#e11d48] animate-[claim-pulse_1.2s_ease-in-out_infinite]' : 'bg-[#7b2cbf]'}`}
            >
              <span className={`h-3 w-3 rounded-full ${rec ? 'bg-white' : 'bg-[#ff5a7a]'}`} aria-hidden />
              {rec ? 'Aufnahme…' : 'REC'}
            </button>
            <button type="button" onClick={togglePlay} className="keycap flex items-center justify-center gap-2 py-3.5 text-[15px] font-bold text-white">
              {playing ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {playing ? 'Stop' : 'Play'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMetro((m) => !m)}
              aria-pressed={metro}
              className={`keycap flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold ${metro ? 'text-white' : 'text-white/55'}`}
            >
              <span className={`led ${metro ? 'led-on' : ''}`} style={{ ['--c' as string]: '#F5B700' }} aria-hidden />
              <Metronome size={15} /> Metronom
            </button>
            <button type="button" onClick={undo} className="keycap flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold text-white/70">
              <Undo2 size={15} /> Zurück
            </button>
            <button type="button" onClick={clear} className="keycap flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold text-white/70">
              <Eraser size={15} /> Leeren
            </button>
          </div>

          {/* tabbed panel: knobs / sound sets / melodies */}
          <div className="well rounded-xl p-1.5">
            <div role="tablist" className="grid grid-cols-3 gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg py-2 text-[12px] font-semibold tracking-wide ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/45'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="flex min-h-[128px] items-center justify-center px-1 pt-2 pb-1">
              {tab === 'knobs' && (
                <div className="grid w-[330px] max-w-full grid-cols-4 place-items-center">
                  <Knob label="Tempo" value={(bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)} display={`${bpm} BPM`} color="#FF5500" defaultValue={(beat.bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)} onChange={(v) => setBpm(Math.round(BPM_MIN + v * (BPM_MAX - BPM_MIN)))} />
                  <Knob label="Swing" value={swing / 0.5} display={`${Math.round(swing * 100)}%`} color="#9D4EDD" defaultValue={beat.swing / 0.5} onChange={(v) => setSwing(v * 0.5)} />
                  <Knob label="Filter" value={filt} display={`${Math.round(cutoffFromNorm(filt))} Hz`} color="#00F5D4" defaultValue={1} onChange={setFilt} />
                  <Knob label="Crush" value={crush} display={crush < 0.02 ? 'OFF' : `${Math.round(16 - crush * 13)} BIT`} color="#F5B700" defaultValue={kit.crush} onChange={setCrush} />
                </div>
              )}
              {tab === 'sounds' && (
                <div className="grid w-full gap-1.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    {KITS.map((k, i) => (
                      <button key={k.name} type="button" onClick={() => pickKit(i)} aria-pressed={kitIdx === i} title={k.hint} className={chip(kitIdx === i)}>
                        <span className={`led ${kitIdx === i ? 'led-on' : ''}`} style={{ ['--c' as string]: '#00F5D4' }} aria-hidden />
                        {k.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[11.5px] text-white/45">{kit.hint} · gilt für alle 8 Pads</p>
                </div>
              )}
              {tab === 'melody' && (
                <div className="grid w-full gap-1.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    {[...MELODIES, { name: 'Aus', hint: 'nur Drums' }].map((m, i) => (
                      <button key={m.name} type="button" onClick={() => pickMelody(i)} aria-pressed={melodyIdx === i} title={m.hint} className={chip(melodyIdx === i)}>
                        <span className={`led ${melodyIdx === i ? 'led-on' : ''}`} style={{ ['--c' as string]: '#9D4EDD' }} aria-hidden />
                        {m.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[11.5px] text-white/45">{melodyIdx === NO_MELODY ? 'nur Drums' : `${MELODIES[melodyIdx].hint} · A-Moll, passt zu jedem Beat`}</p>
                </div>
              )}
            </div>
          </div>

          <p className="min-h-[16px] text-center text-[12px] text-white/50" aria-live="polite">
            {rec ? 'Tipp jetzt die Pads, der Loop läuft mit.' : empty ? 'Wähl einen Beat oder tipp einfach die Pads.' : 'REC drücken und live Fills über den Beat spielen.'}
          </p>

          <footer className="flex items-center justify-between gap-3 border-t border-white/10 pt-2.5 text-[12.5px]">
            <button type="button" onClick={share} className="flex items-center gap-1 text-white/60 hover:text-white">
              {copied ? <Check size={14} className="text-cyan" /> : <Share2 size={14} />} {copied ? 'Link kopiert' : 'Beat teilen'}
            </button>
            <a href={PRODUCT_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-[#c9a2f0] hover:text-white">
              Groovebox entdecken <ExternalLink size={13} />
            </a>
          </footer>
        </div>
      </HardwareChassis>
    </main>
    </>
  );
}
