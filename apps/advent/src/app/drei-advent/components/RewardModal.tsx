'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DoorConfig } from '../data/doors-config';
import type { Lead } from '../lib/useAdvent';
import { ClaimView } from './ClaimView';
import { GiftUnwrap } from './mechanics/GiftUnwrap';
import { QuickQuiz } from './mechanics/QuickQuiz';
import { ScratchCard } from './mechanics/ScratchCard';

type Step = 'mechanic' | 'lead' | 'reveal';

interface Props {
  door: DoorConfig;
  alreadyOpened: boolean;
  lead: Lead | null;
  onComplete: (lead: Lead) => void;
  onClose: () => void;
}

// [plain, brush-script] halves, drei.at headline style ("Rückt den *Haussegen* gerade.")
const TITLES = {
  scratch: ['Freirubbeln &', 'gewinnen!'],
  quiz: ['Drei 5G', 'Wissens-Check'],
  gift: ['Weihnachts-', 'Jackpot!'],
} as const;

export function RewardModal({ door, alreadyOpened, lead, onComplete, onClose }: Props) {
  // Re-viewing a completed door skips straight to the code.
  const [step, setStep] = useState<Step>(alreadyOpened ? 'reveal' : 'mechanic');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const toLead = () => setStep('lead');

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/55 backdrop-blur-[3px] sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Türchen ${door.day}`}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-6 pb-9 text-navy shadow-2xl sm:rounded-[28px]"
      >
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Schließen" className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-ice text-navy/70 hover:bg-ice-2">
          <X size={16} />
        </button>

        <header className="mb-5 pr-10">
          <p className="text-sm font-bold text-drei-deep">
            Türchen {door.day}
            {door.label ? ` · ${door.label}` : ''}
          </p>
          <h2 className="mt-1 text-[1.7rem] leading-tight font-bold tracking-tight">
            {TITLES[door.mechanic][0]} <span className="font-script text-[1.25em] font-normal tracking-normal text-drei">{TITLES[door.mechanic][1]}</span>
          </h2>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {(['mechanic', 'lead', 'reveal'] as const).map((s, i) => (
              <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= ['mechanic', 'lead', 'reveal'].indexOf(step) ? 'bg-drei' : 'bg-ice-2'}`} />
            ))}
          </div>
        </header>

        {step === 'mechanic' && door.mechanic === 'scratch' && <ScratchCard door={door} onDone={toLead} />}
        {step === 'mechanic' && door.mechanic === 'quiz' && <QuickQuiz door={door} onDone={toLead} />}
        {step === 'mechanic' && door.mechanic === 'gift' && <GiftUnwrap door={door} onDone={toLead} />}
        {step !== 'mechanic' && (
          <ClaimView door={door} lead={lead} revealed={step === 'reveal'} onSubmit={(l) => { onComplete(l); setStep('reveal'); }} />
        )}
      </motion.div>
    </motion.div>
  );
}
