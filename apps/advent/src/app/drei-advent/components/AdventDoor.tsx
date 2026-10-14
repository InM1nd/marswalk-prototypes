'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { Check, Lock, Snowflake } from 'lucide-react';
import { useEffect } from 'react';
import type { DoorConfig } from '../data/doors-config';
import type { DoorState } from '../lib/useAdvent';
import { Asset, PrizeIcon } from './Asset';

interface Props {
  door: DoorConfig;
  state: DoorState;
  /** Cell position in the 4-column grid: drives the color pattern. */
  col: number;
  row: number;
  /** Door is mid-swing while the reward modal is about to open. */
  swinging: boolean;
  /** Increments each time a locked click should shake the door. */
  shakeTick: number;
  onClick: () => void;
}

// Horizontal neighbours differ by 1 and vertical by 2 (mod 5), so no two adjacent doors share a color.
const PALETTE = ['bg-drei', 'bg-navy', 'bg-purple', 'bg-drei-deep', 'bg-drei-sky'];

export function AdventDoor({ door, state, col, row, swinging, shakeTick, onClick }: Props) {
  const shake = useAnimationControls();

  useEffect(() => {
    if (shakeTick) shake.start({ x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4 } });
  }, [shakeTick, shake]);

  const isOpen = state === 'opened' || swinging;
  const special = !!door.special;
  const locked = state === 'locked';
  const ribbon = !special && !locked && door.day % 3 === 0;

  const label = locked
    ? `Türchen ${door.day}, gesperrt`
    : state === 'opened'
      ? `Türchen ${door.day}, geöffnet. Gewinn ansehen`
      : `Türchen ${door.day} öffnen`;

  return (
    <motion.div animate={shake} className={`h-full ${special ? 'col-span-2' : ''} ${door.day === 24 ? 'col-start-2' : ''}`}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-disabled={locked}
        className={`group relative block h-full w-full rounded-2xl text-left transition-transform duration-300 ${locked ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}`}
        style={{ perspective: 1000 }}
      >
        {/* inside of the door: the prize */}
        <span className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-ice-2 bg-white shadow-[inset_0_2px_10px_rgb(15_39_59/0.08)]">
          <PrizeIcon icon={door.icon} className={special ? 'h-[62%] w-auto aspect-square' : 'h-[52%] w-[52%]'} />
          {state === 'opened' && (
            <>
              <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-lime text-navy">
                <Check size={12} strokeWidth={3.5} />
              </span>
              <span className="absolute bottom-1 max-w-full truncate px-1.5 text-[9px] font-bold tracking-tight text-navy/60">{door.prize.code}</span>
            </>
          )}
        </span>

        {/* door panel */}
        <motion.span
          initial={false}
          animate={{ rotateY: isOpen ? -110 : 0 }}
          transition={{ type: 'spring', stiffness: 80, damping: 14 }}
          style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          className={`absolute inset-0 overflow-hidden rounded-2xl ${
            locked
              ? 'border border-ice-2 bg-white'
              : `${special ? 'bg-gradient-to-br from-drei-deep to-purple' : PALETTE[(col + row * 2) % PALETTE.length]} shadow-[0_8px_22px_rgb(15_39_59/0.16)]`
          } ${state === 'today' ? 'glow-today' : ''}`}
        >
          {special && door.cover && !locked && (
            <>
              <Asset file={door.cover} className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-tr from-navy/80 via-navy/15 to-transparent" aria-hidden />
            </>
          )}
          {!locked && <span className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-navy/20" aria-hidden />}
          {ribbon && (
            <>
              <span className="absolute inset-y-0 right-[22%] w-2 bg-lime/90" aria-hidden />
              <span className="absolute inset-x-0 top-[24%] h-2 bg-lime/90" aria-hidden />
              <span className="absolute top-[24%] right-[22%] h-4 w-4 translate-x-1 -translate-y-1 rounded-full bg-lime shadow-sm" aria-hidden />
            </>
          )}
          {!locked && !ribbon && state !== 'today' && <Snowflake size={14} className="absolute top-2.5 right-2.5 text-white/50" aria-hidden />}
          {locked && <Lock size={13} className="absolute top-2.5 right-2.5 text-navy/30" aria-hidden />}

          <span className={`absolute bottom-2 left-3 flex flex-col leading-none ${locked ? 'text-navy/25' : 'text-white drop-shadow-[0_2px_6px_rgb(15_39_59/0.35)]'}`}>
            {door.label && !locked && <span className="font-script text-2xl text-lime md:text-3xl">{door.label}</span>}
            <span className={`font-bold tracking-tighter ${special ? 'text-5xl md:text-6xl' : 'text-[2rem] md:text-4xl'}`}>{door.day}</span>
          </span>

          {state === 'today' && (
            <span className="absolute top-2 right-2 rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold text-navy">Heute</span>
          )}
        </motion.span>
      </button>
    </motion.div>
  );
}
