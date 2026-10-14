'use client';

import { useEffect, useRef } from 'react';
import { CUTOFF_MAX, CUTOFF_MIN, STEPS, cutoffFromNorm, qFromReso, type YamahaAudioEngine } from '../lib/yamaha-audio-engine';

/** Brushed-aluminium casing with corner screws and the brand strip. */
export function HardwareChassis({ children }: { children: React.ReactNode }) {
  return (
    <div className="chassis relative rounded-[26px] p-3.5 pt-3 sm:p-6 sm:pt-4 lg:px-5 lg:pt-3 lg:pb-4">
      {[
        'top-2.5 left-2.5',
        'top-2.5 right-2.5 [--r:-20deg]',
        'bottom-2.5 left-2.5 [--r:70deg]',
        'bottom-2.5 right-2.5 [--r:10deg]',
      ].map((pos) => (
        <span key={pos} className={`screw ${pos}`} aria-hidden />
      ))}
      <div className="mb-3 flex items-center gap-3 px-4">
        <span className="text-[15px] font-extrabold tracking-[0.32em] text-white/85 sm:text-lg">YAMAHA</span>
        <span className="h-3.5 w-px bg-white/15" aria-hidden />
        <span className="silk">SQ-16 Beat Studio</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="silk hidden sm:inline">Power</span>
          <span className="led led-on" style={{ ['--c' as string]: '#00F5D4' }} aria-hidden />
        </span>
      </div>
      {children}
    </div>
  );
}

interface OledProps {
  engine: YamahaAudioEngine;
  bpm: number;
  swing: number;
  preset: string;
  step: number;
  cutoff: number;
  drive: number;
  /** Held performance effect, shown in the status line. */
  fx?: string | null;
}

const fmtHz = (hz: number) => (hz >= 1000 ? `${(hz / 1000).toFixed(1)}k` : `${Math.round(hz)}`);

/** Recessed OLED: 60fps dot-matrix spectrum + waveform from the master AnalyserNode, plus telemetry. */
export function OledDisplay({ engine, bpm, swing, preset, step, cutoff, drive, fx }: OledProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const ro = new ResizeObserver(([e]) => {
      w = e.contentRect.width;
      h = e.contentRect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(canvas);

    let freq = new Uint8Array(0);
    let wave = new Uint8Array(0);
    let raf = 0;
    const DOT = 3;
    const GAP = 1.5;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);
      const an = engine.analyser;
      const cols = Math.floor(w / (DOT + GAP));
      const rows = Math.floor(h / (DOT + GAP));
      if (an && freq.length !== an.frequencyBinCount) {
        freq = new Uint8Array(an.frequencyBinCount);
        wave = new Uint8Array(an.fftSize);
      }
      if (an) {
        an.getByteFrequencyData(freq);
        an.getByteTimeDomainData(wave);
      }

      // spectrum as a lit dot matrix, log-spaced bins so the bass doesn't hog one column
      for (let c = 0; c < cols; c++) {
        const bin = an ? Math.min(freq.length - 1, Math.floor(2 * (freq.length / 2) ** (c / cols))) : 0;
        const level = an ? freq[bin] / 255 : 0;
        const lit = Math.max(1, Math.round(level * rows * 0.9));
        for (let r = 0; r < rows; r++) {
          const on = r < lit;
          ctx.fillStyle = on ? (r === lit - 1 && lit > 1 ? '#00F5D4' : 'rgba(214,236,255,0.82)') : 'rgba(214,236,255,0.05)';
          ctx.fillRect(c * (DOT + GAP), h - (r + 1) * (DOT + GAP), DOT, DOT);
        }
      }

      // waveform trace on top
      if (an) {
        ctx.strokeStyle = 'rgba(157,78,221,0.95)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < wave.length; i += 4) {
          const x = (i / wave.length) * w;
          const y = h * 0.42 + ((wave[i] - 128) / 128) * h * 0.35;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [engine]);

  const text = 'font-mono text-[10.5px] sm:text-[11px] tracking-wide text-[#d6ecff] [text-shadow:0_0_6px_rgb(0_245_212/0.35)]';

  return (
    <div className="rounded-2xl border-2 border-zinc-800 bg-black p-3 shadow-[inset_0_2px_14px_rgb(0_0_0/0.9),0_1px_0_rgb(255_255_255/0.06)]">
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-0.5 ${text}`}>
        <span>BPM: {Math.round(bpm)}</span>
        <span>SWING: {Math.round(swing * 100)}%</span>
        <span className="ml-auto truncate">PRESET: {preset}</span>
      </div>
      <canvas ref={ref} className="my-2 block h-20 w-full sm:h-28 lg:h-[64px]" aria-hidden />
      <div className={`flex items-center gap-4 ${text}`}>
        <span className={step >= 0 ? 'text-cyan' : ''}>STEP {String(Math.max(step, 0) + 1).padStart(2, '0')}/{STEPS}</span>
        <span>LPF {fmtHz(cutoff)}</span>
        <span>FM DRV {Math.round(drive * 100)}%</span>
        <span className={`ml-auto ${fx ? 'text-orange' : 'opacity-60'}`}>{fx ? `FX ${fx.toUpperCase()}` : step >= 0 ? '▶ PLAY' : '■ STOP'}</span>
      </div>
    </div>
  );
}

interface MorphProps {
  /** 0..1 -> filter cutoff */
  x: number;
  /** 0..1 -> tempo + FM drive */
  y: number;
  /** RESO knob 0..1, shapes the drawn filter curve */
  reso: number;
  onChange: (x: number, y: number) => void;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** XY touch pad: X sweeps the master low-pass, Y pushes tempo and FM drive together. */
/** Live magnitude response of the master low-pass, drawn across the pad (same log axis as X). */
function FilterCurve({ x, reso }: { x: number; reso: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const probe = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    // an OfflineAudioContext needs no user gesture: a free biquad calculator
    probe.current ??= new OfflineAudioContext(1, 1, 44100).createBiquadFilter();
    const f = probe.current;
    f.type = 'lowpass';
    f.frequency.value = cutoffFromNorm(x);
    f.Q.value = qFromReso(reso);

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const g = canvas.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      const n = Math.max(2, Math.floor(w / 2));
      const freqs = new Float32Array(n);
      for (let i = 0; i < n; i++) freqs[i] = CUTOFF_MIN * (CUTOFF_MAX / CUTOFF_MIN) ** (i / (n - 1));
      const mag = new Float32Array(n);
      f.getFrequencyResponse(freqs, mag, new Float32Array(n));

      // dB -> y: +24 dB at the top, -36 dB at the bottom
      const yOf = (m: number) => h * (1 - (20 * Math.log10(Math.max(m, 1e-4)) + 36) / 60);
      g.clearRect(0, 0, w, h);
      g.beginPath();
      for (let i = 0; i < n; i++) g.lineTo((i / (n - 1)) * w, yOf(mag[i]));
      g.lineTo(w, h);
      g.lineTo(0, h);
      const fill = g.createLinearGradient(0, 0, 0, h);
      fill.addColorStop(0, 'rgba(0,245,212,0.28)');
      fill.addColorStop(1, 'rgba(0,245,212,0.02)');
      g.fillStyle = fill;
      g.fill();
      g.beginPath();
      for (let i = 0; i < n; i++) g.lineTo((i / (n - 1)) * w, yOf(mag[i]));
      g.strokeStyle = '#00F5D4';
      g.lineWidth = 1.5;
      g.shadowColor = '#00F5D4';
      g.shadowBlur = 6;
      g.stroke();
    };
    draw();
    // the pad may mount hidden (phone tab) or resize: redraw whenever its box changes
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [x, reso]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}

export function SoundMorphPad({ x, y, reso, onChange }: MorphProps) {
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onChange(clamp01((e.clientX - r.left) / r.width), clamp01(1 - (e.clientY - r.top) / r.height));
  };

  const key = (e: React.KeyboardEvent) => {
    const d = e.shiftKey ? 0.1 : 0.03;
    const map: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    const v = map[e.key];
    if (!v) return;
    e.preventDefault();
    onChange(clamp01(x + v[0]), clamp01(y + v[1]));
  };

  return (
    <div className="flex h-full flex-col">
      <p className="silk mb-2 flex justify-between">
        <span>Sound Morph · Filter</span>
        <span className="text-white/25">XY</span>
      </p>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Sound Morph: links/rechts Filter, oben/unten Tempo und FM Drive"
        aria-valuetext={`Filter ${Math.round(x * 100)}%, Tempo/Drive ${Math.round(y * 100)}%`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => e.buttons && move(e)}
        onKeyDown={key}
        className="well relative min-h-40 flex-1 cursor-crosshair touch-none overflow-hidden rounded-xl lg:min-h-0"
        style={{
          backgroundImage:
            'linear-gradient(rgb(255 255 255 / 0.045) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.045) 1px, transparent 1px)',
          backgroundSize: '12.5% 12.5%',
        }}
      >
        <FilterCurve x={x} reso={reso} />
        <span className="absolute inset-y-0 w-px bg-cyan/30" style={{ left: `calc(${x} * (100% - 28px) + 14px)` }} aria-hidden />
        <span className="absolute inset-x-0 h-px bg-purple-2/40" style={{ top: `calc(${1 - y} * (100% - 28px) + 14px)` }} aria-hidden />
        <span
          className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 bg-[radial-gradient(circle,#fff_0%,#9D4EDD_45%,transparent_70%)] shadow-[0_0_24px_#9D4EDD]"
          style={{ left: `calc(${x} * (100% - 28px) + 14px)`, top: `calc(${1 - y} * (100% - 28px) + 14px)` }}
          aria-hidden
        />
        <span className="silk absolute right-2 bottom-1.5 text-[8.5px]!">Filter Cutoff →</span>
        <span className="silk absolute top-2 left-2 text-[8.5px]!">↑ Tempo · FM Drive</span>
      </div>
    </div>
  );
}
