'use client';

import { useEffect, useRef, useState } from 'react';

export type Fx = 'stutter' | 'tape' | 'riser' | 'drop';

const FX: { id: Fx; label: string; hint: string; key: string; color: string }[] = [
  { id: 'stutter', label: 'STUTTER', hint: 'Loop 1/8', key: 'q', color: '#9D4EDD' },
  { id: 'tape', label: 'TAPE STOP', hint: 'Bremsen', key: 'w', color: '#00F5D4' },
  { id: 'riser', label: 'RISER', hint: 'Aufbauen', key: 'e', color: '#FF5500' },
  { id: 'drop', label: 'DROP', hint: 'Bass weg', key: 'r', color: '#F5B700' },
];

/** Hold-to-play performance effects (Pocket Operator / SEQTRAK style). Keys Q W E R. */
export function PerformFX({ onFx }: { onFx: (fx: Fx, on: boolean) => void }) {
  const [held, setHeld] = useState<Fx[]>([]);
  // ref mirrors state so pointer/key handlers see the latest value without stale closures
  const heldRef = useRef<Fx[]>([]);

  const set = (fx: Fx, on: boolean) => {
    if (on === heldRef.current.includes(fx)) return;
    heldRef.current = on ? [...heldRef.current, fx] : heldRef.current.filter((x) => x !== fx);
    setHeld(heldRef.current);
    onFx(fx, on);
    if (on) navigator.vibrate?.(12);
  };

  useEffect(() => {
    const key = (on: boolean) => (e: KeyboardEvent) => {
      const fx = FX.find((f) => f.key === e.key.toLowerCase());
      if (fx && !e.repeat && !(e.target instanceof HTMLInputElement)) set(fx.id, on);
    };
    const down = key(true);
    const up = key(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });

  return (
    <div>
      <p className="silk mb-2">Performance FX · gedrückt halten</p>
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {FX.map((f) => {
          const on = held.includes(f.id);
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                set(f.id, true);
              }}
              onPointerUp={() => set(f.id, false)}
              onPointerCancel={() => set(f.id, false)}
              onLostPointerCapture={() => set(f.id, false)}
              onContextMenu={(e) => e.preventDefault()}
              className={`keycap flex h-20 touch-none flex-col items-start justify-between p-2.5 text-left select-none sm:h-16 lg:h-[58px] ${on ? 'translate-y-[2px]' : ''}`}
              style={{ ['--c' as string]: f.color, boxShadow: on ? `0 0 0 1px ${f.color}, 0 0 22px ${f.color}66` : undefined }}
            >
              <span className={`led ${on ? 'led-on' : ''}`} aria-hidden />
              <span>
                <span className="block text-[11px] leading-tight font-bold tracking-wide text-white/90">{f.label}</span>
                <span className="block font-mono text-[9.5px] text-white/40">{f.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
