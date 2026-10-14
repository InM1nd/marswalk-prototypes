'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { DOORS } from '../data/doors-config';
import type { Lead, useAdvent } from '../lib/useAdvent';
import { AdventDoor } from './AdventDoor';
import { RewardModal } from './RewardModal';

const SWING_MS = 800;
const COLS = 4;

// Flow the doors into the 4-column grid once, so each door knows its cell (drives the color pattern).
const CELLS = (() => {
  let col = 0;
  let row = 0;
  return DOORS.map((d) => {
    const span = d.special ? 2 : 1;
    if (col + span > COLS) [col, row] = [0, row + 1];
    if (d.day === 24) col = 1; // centered finale
    const cell = { col, row };
    col += span;
    if (col >= COLS) [col, row] = [0, row + 1];
    return cell;
  });
})();

export function AdventGrid({ advent }: { advent: ReturnType<typeof useAdvent> }) {
  const [swinging, setSwinging] = useState<number | null>(null);
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [shake, setShake] = useState({ day: 0, tick: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const click = (day: number) => {
    if (swinging !== null || modalDay !== null) return;
    const state = advent.doorState(DOORS[day - 1]);
    if (state === 'locked') {
      navigator.vibrate?.(30);
      setShake((s) => ({ day, tick: s.tick + 1 }));
      setToast(`Noch etwas Geduld! Dieses Türchen öffnet sich am ${day}. Dezember.`);
      later(() => setToast(null), 3000);
    } else if (state === 'opened') {
      setModalDay(day);
    } else {
      setSwinging(day);
      later(() => setModalDay(day), SWING_MS);
    }
  };

  const close = () => {
    setModalDay(null);
    setSwinging(null);
  };

  const modalDoor = modalDay ? DOORS[modalDay - 1] : null;

  return (
    <div className="@container">
      <div
        className="grid grid-cols-4 gap-2.5"
        style={{ gridAutoRows: 'calc((100cqw - 3 * 0.625rem) / 4)' }}
      >
        {DOORS.map((door, i) => (
          <AdventDoor
            key={door.day}
            door={door}
            col={CELLS[i].col}
            row={CELLS[i].row}
            state={advent.doorState(door)}
            swinging={swinging === door.day}
            shakeTick={shake.day === door.day ? shake.tick : 0}
            onClick={() => click(door.day)}
          />
        ))}
      </div>

      <AnimatePresence>
        {modalDoor && (
          <RewardModal
            key={modalDoor.day}
            door={modalDoor}
            alreadyOpened={advent.doorState(modalDoor) === 'opened'}
            lead={advent.lead}
            onComplete={(lead: Lead) => advent.completeDoor(modalDoor.day, lead)}
            onClose={close}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-2xl bg-navy px-5 py-3 text-center text-sm font-medium text-white shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
