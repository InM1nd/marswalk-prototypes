'use client';

// Pocket drum machine for a product page: tap 8 pads to play, hit REC to loop what you tap.
// Taps are quantized to 16th notes of a one-bar loop and replayed on the engine's audio clock.
// Same embed rules as /mini: one card, no fixed bars, no full-screen modals.

import { Check, Eraser, ExternalLink, Play, Share2, Sparkles, Square, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { copyText } from '../yamaha-beats/lib/copyText';
import {
  BASS_PATCHES, HAT_PATCHES, LEAD_PATCHES, SNARE_PATCHES, STEPS, YamahaAudioEngine,
  type BassPatch, type HatPatch, type LeadPatch, type SnarePatch,
} from '../yamaha-beats/lib/yamaha-audio-engine';

const PRODUCT_URL = 'https://europe.yamaha.com/de/';

type PadVoice =
  | { kind: 'lead'; patch: LeadPatch; note: number }
  | { kind: 'bass'; patch: BassPatch; note: number }
  | { kind: 'snare'; patch: SnarePatch; note: number }
  | { kind: 'hat'; patch: HatPatch; note: number };

const KICK: BassPatch = { name: 'KICK', wave: 'sine', detune: [0], bodyGain: 0, filterPeak: 200, filterDecay: 0.1, q: 1, punch: 6, punchDecay: 0.05, sub: 1.3, decay: 0.3 };
const SOFT_KICK: BassPatch = { ...KICK, punch: 3, decay: 0.24, sub: 1 };
const LONG_KICK: BassPatch = { ...KICK, punch: 4.5, punchDecay: 0.08, decay: 0.55 };

// Same 8 slots in every kit so a thumb learns the layout: kick, snare, clap, hat / open, perc, bass, lead.
const PADS = [
  { label: 'KICK', color: '#FF5500' },
  { label: 'SNARE', color: '#00F5D4' },
  { label: 'CLAP', color: '#FF4D9D' },
  { label: 'HAT', color: '#10B981' },
  { label: 'OPEN', color: '#F5B700' },
  { label: 'PERC', color: '#4D8DFF' },
  { label: 'BASS', color: '#9D4EDD' },
  { label: 'LEAD', color: '#D6B8F5' },
] as const;

interface Kit {
  name: string;
  bpm: number;
  swing: number;
  voices: PadVoice[];
  /** Starter groove: steps per pad. */
  groove: number[][];
}

const KITS: Kit[] = [
  {
    name: 'Trap',
    bpm: 140,
    swing: 0,
    voices: [
      { kind: 'bass', patch: LONG_KICK, note: 36 },
      { kind: 'snare', patch: SNARE_PATCHES[0], note: 0 },
      { kind: 'snare', patch: SNARE_PATCHES[1], note: 0 },
      { kind: 'hat', patch: HAT_PATCHES[0], note: 0 },
      { kind: 'hat', patch: HAT_PATCHES[1], note: 0 },
      { kind: 'snare', patch: SNARE_PATCHES[2], note: 0 },
      { kind: 'bass', patch: BASS_PATCHES[3], note: 33 },
      { kind: 'lead', patch: LEAD_PATCHES[1], note: 79 },
    ],
    groove: [[0, 3, 6, 10], [], [8], [0, 2, 4, 6, 8, 10, 11, 12, 14, 15], [14], [], [0, 10], []],
  },
  {
    name: 'House',
    bpm: 124,
    swing: 0.12,
    voices: [
      { kind: 'bass', patch: KICK, note: 36 },
      { kind: 'snare', patch: SNARE_PATCHES[0], note: 0 },
      { kind: 'snare', patch: SNARE_PATCHES[1], note: 0 },
      { kind: 'hat', patch: HAT_PATCHES[0], note: 0 },
      { kind: 'hat', patch: HAT_PATCHES[1], note: 0 },
      { kind: 'hat', patch: HAT_PATCHES[2], note: 0 },
      { kind: 'bass', patch: BASS_PATCHES[1], note: 33 },
      { kind: 'lead', patch: LEAD_PATCHES[0], note: 69 },
    ],
    groove: [[0, 4, 8, 12], [], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14], [2, 6, 10, 14], [], [2, 6, 10, 14], []],
  },
  {
    name: 'Lo-Fi',
    bpm: 88,
    swing: 0.3,
    voices: [
      { kind: 'bass', patch: SOFT_KICK, note: 38 },
      { kind: 'snare', patch: SNARE_PATCHES[3], note: 0 },
      { kind: 'snare', patch: SNARE_PATCHES[1], note: 0 },
      { kind: 'hat', patch: HAT_PATCHES[2], note: 0 },
      { kind: 'hat', patch: HAT_PATCHES[3], note: 0 },
      { kind: 'snare', patch: SNARE_PATCHES[2], note: 0 },
      { kind: 'bass', patch: BASS_PATCHES[0], note: 38 },
      { kind: 'lead', patch: LEAD_PATCHES[4], note: 72 },
    ],
    groove: [[0, 7, 10], [4, 12], [], [0, 2, 4, 6, 8, 10, 12, 14], [], [3, 11], [0, 10], []],
  },
];

type Hits = boolean[][]; // [pad][step]
const emptyHits = (): Hits => PADS.map(() => Array<boolean>(STEPS).fill(false));
const fromGroove = (g: number[][]): Hits => PADS.map((_, p) => Array.from({ length: STEPS }, (_, s) => g[p].includes(s)));

// ?d=<kit>-<bpm>-<8 x 4 hex chars>, one 16-bit mask per pad (MSB = step 1)
const encode = (kit: number, bpm: number, h: Hits) =>
  `${kit}-${bpm}-${h.map((row) => row.reduce((n, on, i) => n | (on ? 1 << (STEPS - 1 - i) : 0), 0).toString(16).padStart(4, '0')).join('')}`;
const decode = (code: string | null) => {
  const m = code?.match(/^(\d)-(\d{2,3})-([0-9a-f]{32})$/i);
  if (!m || Number(m[1]) >= KITS.length) return null;
  const hits = PADS.map((_, p) => {
    const n = parseInt(m[3].slice(p * 4, p * 4 + 4), 16);
    return Array.from({ length: STEPS }, (_, i) => !!(n & (1 << (STEPS - 1 - i))));
  });
  return { kit: Number(m[1]), bpm: Math.min(160, Math.max(70, Number(m[2]))), hits };
};

export default function DrumMachine() {
  const engine = useMemo(() => new YamahaAudioEngine(), []);
  const [kitIdx, setKitIdx] = useState(0);
  const [bpm, setBpm] = useState(KITS[0].bpm);
  const [hits, setHits] = useState<Hits>(emptyHits);
  const [playing, setPlaying] = useState(false);
  const [rec, setRec] = useState(false);
  const [step, setStep] = useState(-1);
  const [lit, setLit] = useState<number[]>(() => PADS.map(() => 0));
  const [copied, setCopied] = useState(false);

  // refs mirror state for the audio-clock callbacks and pointer handlers
  const hitsRef = useRef(hits);
  const kitRef = useRef(KITS[0]);
  const recRef = useRef(false);
  const lastTaps = useRef<[number, number][]>([]); // [pad, step] in recording order, for UNDO

  const commit = useCallback((next: Hits) => {
    hitsRef.current = next;
    setHits(next);
  }, []);

  useEffect(() => {
    kitRef.current = KITS[kitIdx];
    engine.swing = KITS[kitIdx].swing;
  }, [engine, kitIdx]);
  useEffect(() => {
    engine.bpm = bpm;
  }, [engine, bpm]);

  const flash = useCallback((pad: number) => {
    setLit((l) => l.map((v, i) => (i === pad ? v + 1 : v)));
    setTimeout(() => setLit((l) => l.map((v, i) => (i === pad ? Math.max(0, v - 1) : v))), 130);
  }, []);

  useEffect(() => {
    // the engine sequences nothing itself; every drum comes from the hook below
    engine.onSchedule = (s, t) => {
      hitsRef.current.forEach((row, p) => {
        if (!row[s]) return;
        const v = kitRef.current.voices[p];
        engine.playAt(v.kind, v.patch, t, 0.95, v.note);
      });
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
    setKitIdx(shared.kit);
    setBpm(shared.bpm);
    commit(shared.hits);
  }, [commit]);

  const play = useCallback(async () => {
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

  const tap = (pad: number, vel: number) => {
    const v = kitRef.current.voices[pad];
    engine.hit(v.kind, v.patch, vel, v.note);
    flash(pad);
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
    if (on) {
      const v = kitRef.current.voices[pad];
      engine.hit(v.kind, v.patch, 0.8, v.note); // audition only, never records
    }
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

  const starter = () => {
    commit(fromGroove(KITS[kitIdx].groove));
    lastTaps.current = [];
    setBpm(KITS[kitIdx].bpm);
    if (!engine.playing) play();
  };

  const pickKit = (i: number) => {
    setKitIdx(i);
    if (!hitsRef.current.some((r) => r.some(Boolean))) setBpm(KITS[i].bpm);
    const v = KITS[i].voices[0];
    engine.hit(v.kind, v.patch, 0.9, v.note); // preview the new kit with its kick
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.search = `?d=${encode(kitIdx, bpm, hits)}`;
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: 'Mein Beat', url: url.toString() }).catch(() => {});
    } else if (await copyText(url.toString())) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const empty = !hits.some((r) => r.some(Boolean));

  return (
    <main className="mx-auto flex max-w-[520px] flex-col gap-3.5 p-4 sm:p-6">
      <header>
        <p className="silk">Yamaha · Drum Machine</p>
        <h1 className="mt-1 text-[22px] leading-tight font-bold text-white sm:text-[26px]">Tipp die Pads, nimm deinen Beat auf</h1>
      </header>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Kit">
        {KITS.map((k, i) => (
          <button
            key={k.name}
            type="button"
            role="radio"
            aria-checked={kitIdx === i}
            onClick={() => pickKit(i)}
            className={`keycap flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold ${kitIdx === i ? 'text-white' : 'text-white/55'}`}
          >
            <span className={`led ${kitIdx === i ? 'led-on' : ''}`} style={{ ['--c' as string]: '#FF5500' }} aria-hidden />
            {k.name}
          </button>
        ))}
      </div>

      {/* pads */}
      <section className="grid grid-cols-4 gap-2.5" aria-label="Drum-Pads">
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
            className="pad relative aspect-[3/4] w-full touch-manipulation rounded-2xl! select-none sm:aspect-square"
          >
            <span className="absolute inset-x-3 bottom-2.5 h-1 rounded-full opacity-70" style={{ background: p.color }} aria-hidden />
            <span className="absolute inset-x-0 top-2.5 text-center font-mono text-[10.5px] font-semibold text-white/70" aria-hidden>
              {p.label}
            </span>
          </button>
        ))}
      </section>

      {/* loop roll: what you recorded; tap a cell to add or remove a hit */}
      <section className="well rounded-2xl p-2.5" aria-label="Aufgenommene Schläge">
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
                  className={`pad h-[13px] w-full touch-manipulation rounded-[3px]! ${s % 4 === 0 && !on ? 'bg-[#2a2c34]!' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* transport */}
      <div className="grid grid-cols-[1.3fr_1fr_auto_auto] gap-2">
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
        <IconButton label="Letzten Schlag zurücknehmen" onClick={undo}>
          <Undo2 size={19} />
        </IconButton>
        <IconButton label="Alles löschen" onClick={clear}>
          <Eraser size={19} />
        </IconButton>
      </div>

      <label className="flex items-center gap-3">
        <span className="silk w-12 shrink-0">Tempo</span>
        <input type="range" min={70} max={160} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} aria-label="Tempo" className="h-8 w-full accent-[#9D4EDD]" />
        <span className="silk w-12 shrink-0 text-right">{bpm}</span>
      </label>

      <p className="min-h-[18px] text-center text-[12.5px] text-white/50" aria-live="polite">
        {rec ? 'Tipp jetzt die Pads, der Loop läuft mit.' : empty ? 'Tipp die Pads. Für einen Loop: REC drücken und losspielen.' : 'Mehr Schichten? Nochmal REC und weitertippen.'}
      </p>

      <footer className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[12.5px]">
        <div className="flex items-center gap-4">
          <button type="button" onClick={starter} className="flex items-center gap-1 text-white/60 hover:text-white">
            <Sparkles size={14} /> Start-Beat
          </button>
          <button type="button" onClick={share} className="flex items-center gap-1 text-white/60 hover:text-white">
            {copied ? <Check size={14} className="text-cyan" /> : <Share2 size={14} />} {copied ? 'Link kopiert' : 'Teilen'}
          </button>
        </div>
        <a href={PRODUCT_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-[#c9a2f0] hover:text-white">
          Groovebox entdecken <ExternalLink size={13} />
        </a>
      </footer>
    </main>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="keycap grid w-12 place-items-center text-white/80">
      {children}
    </button>
  );
}
