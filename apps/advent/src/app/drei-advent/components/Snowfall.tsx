'use client';

import { useEffect, useRef } from 'react';

// Lightweight canvas snow. Skipped entirely for reduced-motion users.
export function Snowfall() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const flakes = Array.from({ length: 45 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.8 + Math.random() * 2.2,
      vy: 0.25 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.vy;
        if (f.y > h + 4) {
          f.y = -4;
          f.x = Math.random() * w;
        }
        const x = f.x + Math.sin(t / 1800 + f.phase) * 12;
        ctx.globalAlpha = 0.25 + f.r * 0.15;
        ctx.fillStyle = '#7cc6e3';
        ctx.beginPath();
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
