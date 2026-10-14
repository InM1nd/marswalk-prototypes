'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { PATCHES, STEPS, TRACKS, type Pattern } from '../lib/yamaha-audio-engine';

interface GridProps {
  pattern: Pattern;
  /** Sounding step, -1 when stopped. */
  step: number;
  /** Selected voice patch per track. */
  patches: number[];
  /** Cycle a track to its next voice patch. */
  onPatch: (track: number) => void;
  onToggle: (track: number, step: number) => void;
}

/** 4 tracks x 16 steps of silicone pads. Phones show each track as two rows of 8. */
export function SequencerGrid({ pattern, step, patches, onPatch, onToggle }: GridProps) {
  return (
    <div className="grid gap-3 sm:gap-2.5 lg:gap-1.5">
      {TRACKS.map((t, tr) => (
        <div key={t.id} className="grid items-center gap-2 sm:grid-cols-[104px_1fr]" style={{ ['--c' as string]: t.color }}>
          <button
            type="button"
            onClick={() => onPatch(tr)}
            aria-label={`${t.name}: Sound ${PATCHES[tr][patches[tr]].name}, tippen für nächsten Sound`}
            className="group flex items-center gap-2 self-stretch rounded-md text-left sm:flex-col sm:items-start sm:justify-center sm:gap-1"
          >
            <span className="flex items-center gap-2">
              <span className={`led ${pattern[tr].some(Boolean) ? 'led-on' : ''}`} aria-hidden />
              <span className="silk text-white/60!">{t.name}</span>
            </span>
            <span className="flex items-center gap-0.5 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[9.5px] text-[#d6ecff] ring-1 ring-white/10 group-hover:ring-white/30">
              {PATCHES[tr][patches[tr]].name}
              <ChevronRight size={10} className="text-white/40" aria-hidden />
            </span>
          </button>
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-16">
            {pattern[tr].map((on, s) => (
              <button
                key={s}
                type="button"
                onClick={() => onToggle(tr, s)}
                aria-pressed={on}
                aria-label={`${t.name} Step ${s + 1}`}
                data-on={on}
                data-head={s === step}
                className="pad relative aspect-square w-full lg:aspect-auto lg:h-9"
              >
                {s % 4 === 0 && <span className="absolute top-1 left-1 h-1 w-1 rounded-full bg-white/25" aria-hidden />}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="hidden grid-cols-[104px_1fr] gap-2 sm:grid" aria-hidden>
        <span />
        <div className="grid grid-cols-16 gap-1.5">
          {Array.from({ length: STEPS }, (_, s) => (
            <span key={s} className={`text-center font-mono text-[9px] ${s === step ? 'text-cyan' : 'text-white/25'}`}>
              {s + 1}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const KEYS = ['1', '2', '3', '4'];

/** Big finger-drum pads; tap higher on a pad for more velocity. Keys 1-4 play them too. */
export function LivePads({ onHit }: { onHit: (track: number, velocity: number) => void }) {
  const [lit, setLit] = useState<number[]>([0, 0, 0, 0]);

  const hit = (tr: number, velocity: number) => {
    onHit(tr, velocity);
    navigator.vibrate?.(8);
    setLit((l) => l.map((v, i) => (i === tr ? v + 1 : v)));
    setTimeout(() => setLit((l) => l.map((v, i) => (i === tr ? Math.max(0, v - 1) : v))), 140);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tr = KEYS.indexOf(e.key);
      if (tr >= 0 && !e.repeat && !(e.target instanceof HTMLInputElement)) hit(tr, 0.9);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  });

  return (
    <div>
      <p className="silk mb-2">Live pads · Finger drumming</p>
      <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
        {TRACKS.map((t, tr) => (
          <div key={t.id} className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              aria-label={`Pad ${tr + 1} ${t.pad} spielen`}
              onPointerDown={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                hit(tr, 0.45 + 0.55 * (1 - (e.clientY - r.top) / r.height));
              }}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), hit(tr, 0.9))}
              data-on={lit[tr] > 0}
              data-head={lit[tr] > 0}
              style={{ ['--c' as string]: t.color }}
              className="pad relative aspect-square w-full touch-none rounded-2xl! sm:aspect-auto sm:h-24 lg:h-[58px]"
            >
              <span className="absolute inset-x-3 bottom-2.5 h-1 rounded-full opacity-70" style={{ background: t.color }} aria-hidden />
              <span className="absolute top-2 left-2.5 text-left font-mono text-[9.5px] leading-tight text-white/45" aria-hidden>
                PAD {tr + 1}
                <span className="block text-white/70">{t.pad}</span>
              </span>
              <span className="absolute top-2 right-2.5 hidden font-mono text-[10px] text-white/25 lg:block" aria-hidden>
                {KEYS[tr]}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
