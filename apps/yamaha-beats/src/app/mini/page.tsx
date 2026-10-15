'use client';

// Embeddable "beat snack": one card, 4 tracks x 8 steps, one filter slider. Meant to sit in an
// <iframe> on a product page (see public/embed-demo.html), so no fixed bars, no full-screen modals.
// Reuses the studio engine and presets untouched; 8 visible steps are mirrored onto the 16-step loop.

import { Check, Dice5, ExternalLink, Play, Share2, Square, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PRESETS, encodeGroove, patternFrom, rollGroove } from '../yamaha-beats/components/PresetSelector';
import { copyText } from '../yamaha-beats/lib/copyText';
import { PATCHES, TRACKS, YamahaAudioEngine, cutoffFromNorm, type Pattern } from '../yamaha-beats/lib/yamaha-audio-engine';

const SHOWN = 8;
const PRODUCT_URL = 'https://europe.yamaha.com/de/';
// Indices into PRESETS (shared with the studio, so links into it stay valid).
const VIBES = [
  { idx: 1, label: 'House' },
  { idx: 3, label: 'Lo-Fi' },
  { idx: 5, label: 'Trap' },
  { idx: 2, label: 'Synthwave' },
];

/** First 8 steps of a 16-step pattern, written to both halves. */
const mirror = (p: Pattern): Pattern => p.map((row) => [...row.slice(0, SHOWN), ...row.slice(0, SHOWN)]);
const seed = (idx: number) => mirror(patternFrom(PRESETS[idx]));

export default function MiniBeat() {
  const engine = useMemo(() => new YamahaAudioEngine(), []);
  const [presetIdx, setPresetIdx] = useState(VIBES[0].idx);
  const [pattern, setPattern] = useState<Pattern>(() => seed(VIBES[0].idx));
  const [patches, setPatches] = useState(PRESETS[VIBES[0].idx].patches);
  const [tone, setTone] = useState(0.85);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    engine.pattern = pattern;
    engine.patches = patches;
    engine.sound = PRESETS[presetIdx].sound;
    engine.bpm = PRESETS[presetIdx].bpm;
    engine.swing = PRESETS[presetIdx].swing;
  }, [engine, pattern, patches, presetIdx]);

  useEffect(() => engine.setCutoff(cutoffFromNorm(0.3 + 0.7 * tone), 0.06), [engine, tone]);

  useEffect(() => {
    engine.onStep = setStep;
    return () => engine.stop();
  }, [engine]);

  const play = useCallback(async () => {
    await engine.start();
    engine.setCutoff(cutoffFromNorm(0.3 + 0.7 * tone));
    setPlaying(true);
  }, [engine, tone]);

  const togglePlay = () => {
    if (!engine.playing) return play();
    engine.stop();
    setPlaying(false);
  };

  const pickVibe = (idx: number) => {
    setPresetIdx(idx);
    setPattern(seed(idx));
    setPatches(PRESETS[idx].patches);
    if (!engine.playing) play();
  };

  const toggle = (tr: number, s: number) => {
    const on = !pattern[tr][s];
    setPattern((p) => p.map((row, i) => (i === tr ? row.map((v, j) => (j % SHOWN === s ? on : v)) : row)));
    if (on && !engine.playing) engine.trigger(tr, 0.8); // stopped: let the tap be heard
    navigator.vibrate?.(6);
  };

  const nextSound = (tr: number) => {
    const next = patches.map((v, i) => (i === tr ? (v + 1) % PATCHES[tr].length : v));
    engine.patches = next; // audition the new sound right away, before the sync effect runs
    setPatches(next);
    if (!engine.playing) engine.trigger(tr, 0.85);
  };

  const dice = () => {
    const roll = rollGroove(presetIdx);
    setPattern(mirror(roll.pattern));
    setPatches(roll.patches);
    navigator.vibrate?.(15);
    if (!engine.playing) play();
  };

  const studioUrl = () => new URL(`../?groove=${encodeGroove(pattern, PRESETS[presetIdx].bpm, presetIdx, patches)}`, window.location.href).toString();

  const share = async () => {
    const url = studioUrl();
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: 'Mein Beat', url }).catch(() => {});
    } else if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const head = step < 0 ? -1 : step % SHOWN;

  return (
    <main className="mx-auto flex max-w-[520px] flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="silk">Yamaha · Beat in 30 Sekunden</p>
          <h1 className="mt-1 text-[22px] leading-tight font-bold text-white sm:text-[26px]">Bau deinen eigenen Beat</h1>
        </div>
        <Meter engine={engine} playing={playing} />
      </header>

      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Vibe">
        {VIBES.map((v) => (
          <button
            key={v.idx}
            type="button"
            role="radio"
            aria-checked={presetIdx === v.idx}
            onClick={() => pickVibe(v.idx)}
            className={`keycap flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold ${presetIdx === v.idx ? 'text-white' : 'text-white/55'}`}
          >
            <span className={`led ${presetIdx === v.idx ? 'led-on' : ''}`} style={{ ['--c' as string]: '#FF5500' }} aria-hidden />
            {v.label}
          </button>
        ))}
      </div>

      <section className="well grid gap-3 rounded-2xl p-3 sm:p-4" aria-label="Beat-Raster">
        {TRACKS.map((t, tr) => (
          <div key={t.id} style={{ ['--c' as string]: t.color }}>
            <button
              type="button"
              onClick={() => nextSound(tr)}
              aria-label={`${t.pad}: Sound ${PATCHES[tr][patches[tr]].name}, tippen für nächsten Sound`}
              className="mb-1.5 flex items-center gap-2 text-left"
            >
              <span className={`led ${pattern[tr].some(Boolean) ? 'led-on' : ''}`} aria-hidden />
              <span className="silk text-white/60!">{t.pad}</span>
              <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-[#d6ecff] ring-1 ring-white/10">
                {PATCHES[tr][patches[tr]].name} ›
              </span>
            </button>
            <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
              {pattern[tr].slice(0, SHOWN).map((on, s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(tr, s)}
                  aria-pressed={on}
                  aria-label={`${t.pad} Schritt ${s + 1}`}
                  data-on={on}
                  data-head={s === head}
                  className="pad aspect-square w-full touch-manipulation sm:aspect-[5/4]"
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <label className="flex items-center gap-3">
        <span className="silk w-12 shrink-0">Dumpf</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={tone}
          onChange={(e) => setTone(Number(e.target.value))}
          aria-label="Filter: dumpf bis hell"
          className="h-8 w-full accent-[#9D4EDD]"
        />
        <span className="silk w-10 shrink-0 text-right">Hell</span>
      </label>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className={`flex items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-white ${playing ? 'bg-white/10' : 'bg-[#7b2cbf] animate-[claim-pulse_2.2s_ease-in-out_infinite]'}`}
        >
          {playing ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          {playing ? 'Stop' : 'Play'}
        </button>
        <IconButton label="Würfeln" onClick={dice}>
          <Dice5 size={20} />
        </IconButton>
        <IconButton label="Leeren" onClick={() => setPattern((p) => p.map((row) => row.map(() => false)))}>
          <Trash2 size={19} />
        </IconButton>
        <IconButton label={copied ? 'Link kopiert' : 'Teilen'} onClick={share}>
          {copied ? <Check size={20} className="text-cyan" /> : <Share2 size={19} />}
        </IconButton>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[12.5px]">
        <button type="button" onClick={() => window.open(studioUrl(), '_blank', 'noopener')} className="text-white/60 underline-offset-2 hover:text-white hover:underline">
          Im Studio weitermachen
        </button>
        <a href={PRODUCT_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-[#c9a2f0] hover:text-white">
          Groovebox entdecken <ExternalLink size={13} />
        </a>
      </footer>
    </main>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="keycap grid w-12 place-items-center text-white/80 sm:w-14">
      {children}
    </button>
  );
}

/** Tiny 7-band level meter off the engine analyser. */
function Meter({ engine, playing }: { engine: YamahaAudioEngine; playing: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!playing || !engine.analyser) return;
    const an = engine.analyser;
    const data = new Uint8Array(an.frequencyBinCount);
    const bars = [...(ref.current?.children ?? [])] as HTMLElement[];
    let raf = 0;
    const draw = () => {
      an.getByteFrequencyData(data);
      bars.forEach((b, i) => (b.style.transform = `scaleY(${0.12 + (data[2 + i * i * 4] / 255) * 0.88})`));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      bars.forEach((b) => (b.style.transform = 'scaleY(0.12)'));
    };
  }, [engine, playing]);

  return (
    <div ref={ref} className="flex h-9 shrink-0 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className="h-full w-[5px] origin-bottom scale-y-[0.12] rounded-full transition-transform duration-75" style={{ background: TRACKS[i % 4].color }} />
      ))}
    </div>
  );
}
