'use client';

import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { Ticket } from 'lucide-react';
import { useState } from 'react';
import type { DoorConfig } from '../../data/doors-config';
import { celebrate } from '../../lib/celebrate';
import { Asset, PrizeIcon } from '../Asset';
import { ContinueButton } from './ContinueButton';

const TAPS = 3;
const HINTS = ['Tippe auf das Geschenk!', 'Noch 2× tippen …', 'Noch einmal!'];

// Every layer fills the same square, so generated layers (gift-*.webp, rendered from
// one camera) stack exactly; the CSS fallbacks are positioned inside that square too.
const layer = 'absolute inset-0 h-full w-full';

export function GiftUnwrap({ door, onDone }: { door: DoorConfig; onDone: () => void }) {
  const [taps, setTaps] = useState(0);
  const box = useAnimationControls();
  const lid = useAnimationControls();
  const bow = useAnimationControls();
  const reduced = useReducedMotion();
  const opened = taps >= TAPS;

  const tap = () => {
    if (opened) return;
    const next = taps + 1;
    setTaps(next);
    navigator.vibrate?.(next === TAPS ? [30, 40, 60] : 25);

    if (next === 1) {
      box.start({ scaleY: [1, 0.86, 1.08, 1], scaleX: [1, 1.1, 0.96, 1], transition: { duration: 0.45 } });
      bow.start({ rotate: [0, -18, 14, -8, 0], scale: [1, 1.18, 1], transition: { duration: 0.55 } });
    } else if (next === 2) {
      box.start({ rotate: [0, -9, 9, -6, 6, 0], scale: [1, 1.06, 1], transition: { duration: 0.5 } });
      lid.start({ y: [0, -22, 0], rotate: [0, -7, 0], transition: { duration: 0.5 } });
      bow.start({ rotate: [0, 25, -20, 0], transition: { duration: 0.5 } });
    } else {
      box.start({ y: [0, 12, -8, 0], scaleY: [1, 0.84, 1.06, 1], transition: { duration: 0.5 } });
      bow.start({ y: -230, x: -110, rotate: -280, opacity: 0, transition: { duration: 0.85, ease: 'easeOut' } });
      lid.start({ y: -190, x: 90, rotate: 40, opacity: 0, transition: { duration: 0.8, ease: 'easeOut' } });
      celebrate();
    }
  };

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={tap}
        disabled={opened}
        aria-label={opened ? 'Geschenk ausgepackt' : `Geschenk auspacken, noch ${TAPS - taps}× tippen`}
        className="relative mx-auto block aspect-square w-64 cursor-pointer select-none disabled:cursor-default"
      >
        {/* light: peeks out on tap 2, bursts when opened */}
        <motion.span
          className="rays absolute -inset-[30%] rounded-full"
          initial={false}
          animate={{ opacity: opened ? 1 : taps === 2 ? 0.35 : 0, scale: opened ? 1 : 0.4 }}
          transition={{ duration: 0.6 }}
          aria-hidden
        />
        <motion.span
          className={layer}
          animate={taps === 0 && !reduced ? { rotate: [0, -4, 4, -2, 0] } : { rotate: 0 }}
          transition={taps === 0 ? { duration: 0.7, repeat: Infinity, repeatDelay: 1.3 } : undefined}
          aria-hidden
        >
          <motion.span className={layer} animate={box} style={{ transformOrigin: '50% 90%' }}>
            <span className="absolute inset-x-[22%] bottom-[3%] h-[6%] rounded-[50%] bg-navy/15 blur-[3px]" />
            <Asset
              file="gift-body.webp"
              className={layer}
              fallback={
                <span className="absolute inset-x-[20%] top-[48%] bottom-[8%] overflow-hidden rounded-b-[22%] rounded-t-md bg-gradient-to-b from-[#8a55bf] to-[#5b2f85] shadow-[inset_-10px_0_18px_rgb(0_0_0/0.18)]">
                  <span className="absolute inset-y-0 left-1/2 w-[18%] -translate-x-1/2 bg-gradient-to-b from-lime to-[#c3d42c]" />
                </span>
              }
            />
            <motion.span className={layer} initial={false} animate={{ opacity: opened ? 1 : 0 }} transition={{ duration: 0.4 }} aria-hidden>
                  <Asset
                file="gift-glow.webp"
                className={layer}
                fallback={<span className="absolute inset-[5%] rounded-full bg-[radial-gradient(circle_at_50%_45%,#fff_0%,rgb(221_238_61/0.6)_30%,transparent_65%)]" />}
              />
                </motion.span>
            <motion.span className={layer} animate={lid} style={{ transformOrigin: '50% 44%' }}>
              <Asset
                file="gift-lid.webp"
                className={layer}
                fallback={
                  <span className="absolute inset-x-[15%] top-[36%] h-[15%] overflow-hidden rounded-[18px] bg-gradient-to-b from-[#a375d4] to-purple shadow-[0_6px_10px_rgb(15_39_59/0.2)]">
                    <span className="absolute inset-y-0 left-1/2 w-[17%] -translate-x-1/2 bg-gradient-to-b from-[#ecf87a] to-lime" />
                  </span>
                }
              />
            </motion.span>
            <motion.span className={layer} animate={bow} style={{ transformOrigin: '50% 32%' }}>
              <Asset
                file="gift-bow.webp"
                className={layer}
                fallback={
                  <span className="absolute top-[21%] left-1/2 h-[17%] w-[44%] -translate-x-1/2">
                    <span className="absolute top-0 left-0 h-full w-1/2 origin-right -rotate-12 rounded-[55%_25%_25%_55%] border-[6px] border-lime bg-[#b7c722] shadow-[inset_2px_3px_0_rgb(255_255_255/0.5)]" />
                    <span className="absolute top-0 right-0 h-full w-1/2 origin-left rotate-12 rounded-[25%_55%_55%_25%] border-[6px] border-lime bg-[#b7c722] shadow-[inset_-2px_3px_0_rgb(255_255_255/0.5)]" />
                    <span className="absolute top-1/2 left-1/2 h-[45%] w-[22%] -translate-1/2 rounded-full bg-lime shadow-[0_2px_4px_rgb(15_39_59/0.25)]" />
                  </span>
                }
              />
            </motion.span>
          </motion.span>
        </motion.span>

        {/* prize rises out of the box: drawn on top, invisible until opened */}
        <motion.span
          className="absolute inset-x-[29%] top-[26%] aspect-square drop-shadow-[0_10px_20px_rgb(15_39_59/0.25)]"
          initial={{ y: '40%', scale: 0.3, opacity: 0 }}
          animate={opened ? { y: '-45%', scale: 1, opacity: 1 } : { y: '40%', scale: 0.3, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 13, delay: opened ? 0.35 : 0 }}
          aria-hidden
        >
          <PrizeIcon icon={door.icon} className="h-full w-full" />
        </motion.span>

        {/* tickets fly out */}
        {opened &&
          Array.from({ length: door.prize.tickets }, (_, i) => {
            const a = (-150 + (120 / Math.max(1, door.prize.tickets - 1)) * i) * (Math.PI / 180);
            return (
              <motion.span
                key={i}
                className="absolute top-1/2 left-1/2 -ml-5 -mt-3 inline-flex h-6 w-10 items-center justify-center rounded-md bg-lime text-navy ring-2 ring-white shadow-lg"
                initial={{ x: 0, y: 0, scale: 0.2, opacity: 0, rotate: 0 }}
                animate={{ x: Math.cos(a) * 140, y: Math.sin(a) * 120, scale: 1, opacity: [0, 1, 1, 0], rotate: (i - 2) * 18 }}
                transition={{ duration: 1.5, delay: 0.25 + i * 0.06, ease: 'easeOut' }}
                aria-hidden
              >
                <Ticket size={14} />
              </motion.span>
            );
          })}
      </button>

      {!opened ? (
        <>
          <p className="mt-2 text-base font-bold" role="status">{HINTS[taps]}</p>
          <div className="mt-3 flex justify-center gap-2" aria-hidden>
            {Array.from({ length: TAPS }, (_, i) => (
              <span key={i} className={`h-2.5 rounded-full transition-all ${i < taps ? 'w-6 bg-drei' : 'w-2.5 bg-ice-2'}`} />
            ))}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <p className="text-4xl font-bold tracking-tight">
            +{door.prize.tickets} <span className="font-script text-[1.15em] font-normal text-drei">Glückslose!</span>
          </p>
          <p className="mt-1 text-sm text-navy/70">Plus Sofortgewinn: {door.prize.title}</p>
          <ContinueButton onClick={onDone}>Gewinn sichern</ContinueButton>
        </motion.div>
      )}
    </div>
  );
}
