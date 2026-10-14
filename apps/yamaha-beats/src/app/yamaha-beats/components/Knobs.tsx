'use client';

import { useRef } from 'react';

interface KnobProps {
  label: string;
  /** 0..1 */
  value: number;
  display: string;
  color: string;
  defaultValue: number;
  onChange: (v: number) => void;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const SWEEP = 270;

// SVG arc from -135deg (min) clockwise; 0deg = 12 o'clock
function arc(r: number, from: number, to: number) {
  const pt = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(32 + r * Math.cos(a)).toFixed(2)} ${(32 + r * Math.sin(a)).toFixed(2)}`;
  };
  return `M ${pt(from)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${pt(to)}`;
}

/** Hardware rotary knob: drag up/down (or arrow keys), double-click/double-tap resets. */
export function Knob({ label, value, display, color, defaultValue, onChange }: KnobProps) {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const angle = -SWEEP / 2 + value * SWEEP;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={display}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, v: value };
        }}
        onPointerMove={(e) => {
          if (drag.current) onChange(clamp01(drag.current.v + (drag.current.y - e.clientY) / 160));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={() => onChange(defaultValue)}
        onKeyDown={(e) => {
          const d = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05 }[e.key];
          if (d === undefined) return;
          e.preventDefault();
          onChange(clamp01(value + d));
        }}
        className="relative h-14 w-14 cursor-ns-resize touch-none rounded-full lg:h-11 lg:w-11"
      >
        <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d={arc(29, -SWEEP / 2, SWEEP / 2)} stroke="rgb(255 255 255 / 0.08)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          {value > 0.005 && (
            <path d={arc(29, -SWEEP / 2, angle)} stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
          )}
        </svg>
        {/* knob cap: knurled rim + indicator line */}
        <span
          className="absolute inset-[9px] rounded-full shadow-[0_3px_6px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.12)]"
          style={{
            background: 'repeating-conic-gradient(#202127 0deg 6deg, #2a2b31 6deg 12deg)',
            transform: `rotate(${angle}deg)`,
          }}
          aria-hidden
        >
          <span className="absolute inset-[4px] rounded-full bg-[radial-gradient(circle_at_40%_30%,#3a3c44,#17181c_75%)]" />
          <span className="absolute top-[5px] left-1/2 h-[9px] w-[2.5px] -translate-x-1/2 rounded-full bg-white/85" />
        </span>
      </div>
      <span className="silk text-[8.5px]!">{label}</span>
      <span className="-mt-1 font-mono text-[10px] text-[#d6ecff]/70">{display}</span>
    </div>
  );
}
