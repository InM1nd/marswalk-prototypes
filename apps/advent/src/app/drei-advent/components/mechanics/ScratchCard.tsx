'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DoorConfig } from '../../data/doors-config';
import { celebrate } from '../../lib/celebrate';
import { asset } from '../../lib/assets';
import { PrizeIcon } from '../Asset';
import { ContinueButton } from './ContinueButton';

const BRUSH = 44;
const REVEAL_AT = 0.45;

// Holographic foil (cyan, lime, purple, silver). Generated foil art replaces it once it loads.
function paintFoil(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#bfe9f7');
  g.addColorStop(0.25, '#e9f5b0');
  g.addColorStop(0.45, '#d9c8ee');
  g.addColorStop(0.65, '#9fdcf2');
  g.addColorStop(0.85, '#f1f6fa');
  g.addColorStop(1, '#b7c9e8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.7})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
  }
  ctx.fillStyle = 'rgba(0,119,157,0.18)';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 16; y < h; y += 32) for (let x = (y / 32) % 2 ? 16 : 32; x < w; x += 32) ctx.fillText('❄', x, y);
}

function paintLabel(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(w / 2 - 104, h / 2 - 26, 208, 52, 26);
  ctx.fill();
  ctx.fillStyle = '#0f273b';
  ctx.font = 'bold 17px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Hier freirubbeln', w / 2, h / 2 + 1);
}

function clearedRatio(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let cleared = 0;
  let total = 0;
  // Coarse sample: every 6th pixel in both axes is plenty for a 45% threshold.
  for (let y = 0; y < h; y += 6) {
    for (let x = 0; x < w; x += 6) {
      total++;
      if (data[(y * w + x) * 4 + 3] < 128) cleared++;
    }
  }
  return cleared / total;
}

export function ScratchCard({ door, onDone }: { door: DoorConfig; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const checkedAt = useRef(0);
  const scratched = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d', { willReadFrequently: true });
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = c.getBoundingClientRect();
    c.width = width * dpr;
    c.height = height * dpr;
    ctx.scale(dpr, dpr);
    paintFoil(ctx, width, height);
    paintLabel(ctx, width, height);
    const foil = new Image();
    foil.onload = () => {
      if (scratched.current) return; // never re-cover what the user already scratched
      ctx.drawImage(foil, 0, 0, width, height);
      paintLabel(ctx, width, height);
    };
    foil.src = asset('scratch-foil.webp');
  }, []);

  const finish = useCallback(() => {
    setDone((d) => {
      if (!d) celebrate();
      return true;
    });
  }, []);

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d', { willReadFrequently: true });
    if (!c || !ctx || !last.current) return;
    scratched.current = true;
    const r = c.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = BRUSH;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    const now = performance.now();
    if (now - checkedAt.current > 120) {
      checkedAt.current = now;
      if (clearedRatio(ctx, c.width, c.height) > REVEAL_AT) finish();
    }
  };

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-[0_12px_30px_rgb(15_39_59/0.18)]">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-drei-sky via-drei to-drei-deep px-8 text-center text-white">
          <PrizeIcon icon={door.icon} className="h-24 w-24" />
          <p className="font-script text-3xl leading-none text-lime">Du gewinnst!</p>
          <p className="text-xl leading-tight font-bold">{door.prize.title}</p>
        </div>
        <canvas
          ref={canvasRef}
          aria-hidden
          className={`absolute inset-0 h-full w-full touch-none transition-opacity duration-700 ${done ? 'pointer-events-none opacity-0' : 'cursor-grab'}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const r = e.currentTarget.getBoundingClientRect();
            last.current = { x: e.clientX - r.left, y: e.clientY - r.top };
            scratch(e);
          }}
          onPointerMove={scratch}
          onPointerUp={() => (last.current = null)}
          onPointerCancel={() => (last.current = null)}
        />
      </div>
      {done ? (
        <ContinueButton onClick={onDone}>Gewinn sichern</ContinueButton>
      ) : (
        <button type="button" onClick={finish} className="mt-4 block w-full text-center text-sm font-medium text-drei-deep underline underline-offset-4 hover:text-navy">
          Alles aufdecken
        </button>
      )}
    </div>
  );
}
