'use client';

// Pocket drum machine for a product page, voiced like an 80s PCM drum machine (RX-style, synthesized).
// Pick one of four ready-made beats, tap the eight pads, hit REC to loop what you play.
// Taps are quantized to 16th notes of a one-bar loop and replayed on the engine's audio clock.
// Same embed rules as /mini: one card, no fixed bars, no full-screen modals.

import { Check, Eraser, ExternalLink, Metronome, Play, Share2, Square, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HardwareChassis, OledDisplay } from '../yamaha-beats/components/HardwareChassis';
import { Knob } from '../yamaha-beats/components/Knobs';
import { copyText } from '../yamaha-beats/lib/copyText';
import { DEFAULT_MIX, STEPS, YamahaAudioEngine, cutoffFromNorm, type RxName } from '../yamaha-beats/lib/yamaha-audio-engine';

const PRODUCT_URL = 'https://europe.yamaha.com/de/';
const BPM_MIN = 70;
const BPM_MAX = 160;

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

interface Beat {
  name: string;
  bpm: number;
  swing: number;
  /** Starter loop: steps per pad, in PADS order. */
  groove: number[][];
}

const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];

const BEATS: Beat[] = [
  { name: 'Disco', bpm: 118, swing: 0, groove: [[0, 4, 8, 12], [4, 12], [4, 12], [], [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15], [2, 6, 10, 14], [15], [7]] },
  { name: 'Hip-Hop', bpm: 92, swing: 0.25, groove: [[0, 2, 7, 10], [4, 12], [], [7, 15], EIGHTHS, [14], [], []] },
  { name: 'Electro', bpm: 125, swing: 0, groove: [[0, 3, 8, 10], [4, 12], [12], [], EIGHTHS, [6, 14], [11, 13], [2, 10]] },
  { name: 'Pop 84', bpm: 108, swing: 0, groove: [[0, 2, 8, 10], [4, 12], [], [], EIGHTHS, [14], [14, 15], []] },
];

const CRUSH_DEFAULT = 0.3; // about 12 bit
const PAD_COUNT = PADS.length;

type Hits = boolean[][]; // [pad][step]
const emptyHits = (): Hits => Array.from({ length: PAD_COUNT }, () => Array<boolean>(STEPS).fill(false));
const fromGroove = (g: number[][]): Hits => g.map((steps) => Array.from({ length: STEPS }, (_, s) => steps.includes(s)));

// ?d=<beat>-<bpm>-<8 x 4 hex chars>, one 16-bit mask per pad (MSB = step 1)
const encode = (beat: number, bpm: number, h: Hits) =>
  `${beat}-${bpm}-${h.map((row) => row.reduce((n, on, i) => n | (on ? 1 << (STEPS - 1 - i) : 0), 0).toString(16).padStart(4, '0')).join('')}`;
const decode = (code: string | null) => {
  const m = code?.match(/^(\d)-(\d{2,3})-([0-9a-f]{32})$/i);
  if (!m || Number(m[1]) >= BEATS.length) return null;
  const hits = Array.from({ length: PAD_COUNT }, (_, p) => {
    const n = parseInt(m[3].slice(p * 4, p * 4 + 4), 16);
    return Array.from({ length: STEPS }, (_, i) => !!(n & (1 << (STEPS - 1 - i))));
  });
  return { beat: Number(m[1]), bpm: Math.min(BPM_MAX, Math.max(BPM_MIN, Number(m[2]))), hits };
};

export default function DrumMachine() {
  const engine = useMemo(() => new YamahaAudioEngine(), []);
  const [beatIdx, setBeatIdx] = useState(0);
  const [bpm, setBpm] = useState(BEATS[0].bpm);
  const [swing, setSwing] = useState(BEATS[0].swing);
  const [filt, setFilt] = useState(1);
  const [crush, setCrush] = useState(CRUSH_DEFAULT);
  const [hits, setHits] = useState<Hits>(emptyHits);
  const [playing, setPlaying] = useState(false);
  const [rec, setRec] = useState(false);
  const [metro, setMetro] = useState(false);
  const [step, setStep] = useState(-1);
  const [lit, setLit] = useState<number[]>(() => Array(PAD_COUNT).fill(0));
  const [copied, setCopied] = useState(false);

  // refs mirror state for the audio-clock callbacks and pointer handlers
  const hitsRef = useRef(hits);
  const recRef = useRef(false);
  const metroRef = useRef(false);
  const lastTaps = useRef<[number, number][]>([]); // [pad, step] in recording order, for UNDO

  const beat = BEATS[beatIdx];

  const commit = useCallback((next: Hits) => {
    hitsRef.current = next;
    setHits(next);
  }, []);

  useEffect(() => {
    engine.bpm = bpm;
    engine.swing = swing;
  }, [engine, bpm, swing]);
  useEffect(() => {
    metroRef.current = metro;
  }, [metro]);
  useEffect(() => engine.setCutoff(cutoffFromNorm(filt)), [engine, filt]);
  useEffect(() => engine.setMix({ ...DEFAULT_MIX, echo: 0, space: 0.08, crush, level: 0.62 }), [engine, crush]);

  const flash = useCallback((pad: number) => {
    setLit((l) => l.map((v, i) => (i === pad ? v + 1 : v)));
    setTimeout(() => setLit((l) => l.map((v, i) => (i === pad ? Math.max(0, v - 1) : v))), 130);
  }, []);

  useEffect(() => {
    // the engine sequences nothing itself; every sound comes from the hook below
    engine.onSchedule = (s, t) => {
      if (metroRef.current && s % 4 === 0) engine.click(t, s === 0);
      hitsRef.current.forEach((row, p) => {
        if (!row[s]) return;
        engine.playAt('rx', PADS[p].voice, t, 0.95);
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
    setBeatIdx(shared.beat);
    setBpm(shared.bpm);
    setSwing(BEATS[shared.beat].swing);
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

  // choosing a beat loads its drums and melody and starts playing, ready to play over
  const pickBeat = (i: number) => {
    setBeatIdx(i);
    setBpm(BEATS[i].bpm);
    setSwing(BEATS[i].swing);
    lastTaps.current = [];
    commit(fromGroove(BEATS[i].groove));
    if (!engine.playing) play();
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.search = `?d=${encode(beatIdx, bpm, hits)}`;
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: 'Mein Beat', url: url.toString() }).catch(() => {});
    } else if (await copyText(url.toString())) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const empty = !hits.some((r) => r.some(Boolean));

  return (
    <main className="mx-auto max-w-[520px] p-3 sm:p-5">
      <HardwareChassis>
        <div className="grid gap-3">
          <OledDisplay engine={engine} bpm={bpm} swing={swing} preset={beat.name.toUpperCase()} step={step} cutoff={cutoffFromNorm(filt)} drive={0} fx={rec ? '● REC' : null} mini />

          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Beat-Vorlage">
            {BEATS.map((b, i) => (
              <button
                key={b.name}
                type="button"
                role="radio"
                aria-checked={beatIdx === i}
                onClick={() => pickBeat(i)}
                className={`keycap flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold ${beatIdx === i ? 'text-white' : 'text-white/55'} ${empty && !playing ? 'animate-[hint_2.4s_ease-in-out_infinite]' : ''}`}
              >
                <span className={`led ${beatIdx === i ? 'led-on' : ''}`} style={{ ['--c' as string]: '#FF5500' }} aria-hidden />
                {b.name}
              </button>
            ))}
          </div>

          {/* top row: drums, bottom row: notes of the scale */}
          <section className="grid grid-cols-4 gap-2" aria-label="Drum-Pads">
            {PADS.map((p, i) => (
              <button
                key={i}
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
                <div key={pi} className="grid grid-cols-16 gap-[3px]" style={{ ['--c' as string]: p.color }}>
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

          <div className="well grid grid-cols-4 place-items-center rounded-xl px-2 py-3">
            <Knob label="Tempo" value={(bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)} display={`${bpm} BPM`} color="#FF5500" defaultValue={(beat.bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)} onChange={(v) => setBpm(Math.round(BPM_MIN + v * (BPM_MAX - BPM_MIN)))} />
            <Knob label="Swing" value={swing / 0.5} display={`${Math.round(swing * 100)}%`} color="#9D4EDD" defaultValue={beat.swing / 0.5} onChange={(v) => setSwing(v * 0.5)} />
            <Knob label="Filter" value={filt} display={`${Math.round(cutoffFromNorm(filt))} Hz`} color="#00F5D4" defaultValue={1} onChange={setFilt} />
            <Knob label="Crush" value={crush} display={crush < 0.02 ? 'OFF' : `${Math.round(16 - crush * 13)} BIT`} color="#F5B700" defaultValue={CRUSH_DEFAULT} onChange={setCrush} />
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
  );
}
