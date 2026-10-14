'use client';

import { RotateCcw } from 'lucide-react';
import type { SimDate } from '../lib/useAdvent';

interface Props {
  demoMode: boolean;
  simDate: SimDate;
  onDemoMode: (on: boolean) => void;
  onSimDate: (d: SimDate) => void;
  onReset: () => void;
}

const DATES: { value: SimDate; label: string }[] = [
  { value: 'real', label: 'Real Date' },
  { value: '1', label: '1. Dez (Start)' },
  { value: '6', label: '6. Dez (Nikolaus)' },
  { value: '24', label: '24. Dez (Finale)' },
];

export function PitchControls({ demoMode, simDate, onDemoMode, onSimDate, onReset }: Props) {
  return (
    <div className="sticky top-0 z-40 bg-navy text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-xs">
        <span className="font-mono text-[10px] tracking-[0.15em] text-white/45 uppercase">marswalk Pitch Controls</span>

        <label className="flex cursor-pointer items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={demoMode}
            onClick={() => onDemoMode(!demoMode)}
            className={`relative h-5 w-9 rounded-full transition-colors ${demoMode ? 'bg-lime' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform ${demoMode ? 'translate-x-4 bg-navy' : 'bg-white'}`} />
          </button>
          <span className="text-white/80">Demo Mode: Unlock All Doors</span>
        </label>

        <select
          aria-label="Datum simulieren"
          value={simDate}
          onChange={(e) => onSimDate(e.target.value as SimDate)}
          className="rounded-lg border border-white/15 bg-navy px-2 py-1 text-white/90"
        >
          {DATES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onReset}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-white/80 transition-colors hover:border-white/40 hover:text-white"
        >
          <RotateCcw size={13} /> Reset Progress
        </button>
      </div>
    </div>
  );
}
