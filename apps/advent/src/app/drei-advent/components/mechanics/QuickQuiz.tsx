'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { DoorConfig } from '../../data/doors-config';
import { celebrate } from '../../lib/celebrate';
import { ContinueButton } from './ContinueButton';

const LETTERS = ['A', 'B', 'C', 'D'];

export function QuickQuiz({ door, onDone }: { door: DoorConfig; onDone: () => void }) {
  const quiz = door.quiz!;
  // Shuffle once so the right answer isn't always first (modal only mounts client-side).
  const [options] = useState(() =>
    quiz.options.map((text, i) => ({ text, ok: i === quiz.correct })).sort(() => Math.random() - 0.5),
  );
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState<number | null>(null);

  const pick = (i: number) => {
    if (solved !== null || wrong.includes(i)) return;
    if (options[i].ok) {
      setSolved(i);
      celebrate();
    } else {
      navigator.vibrate?.(30);
      setWrong((w) => [...w, i]);
    }
  };

  return (
    <div>
      <p className="text-xl leading-snug font-bold">{quiz.question}</p>
      <div className="mt-4 grid gap-2.5">
        {options.map((o, i) => {
          const isWrong = wrong.includes(i);
          const isRight = solved === i;
          return (
            <motion.button
              key={o.text}
              type="button"
              onClick={() => pick(i)}
              disabled={isWrong || (solved !== null && !isRight)}
              animate={isWrong ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left font-bold transition-colors ${
                isRight
                  ? 'border-lime bg-lime'
                  : isWrong
                    ? 'border-ice-2 bg-ice text-navy/35 line-through'
                    : 'border-ice-2 bg-white hover:border-drei disabled:opacity-40'
              }`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${isRight ? 'bg-navy text-lime' : isWrong ? 'bg-ice-2' : 'bg-drei text-white'}`}>{LETTERS[i]}</span>
              <span>{o.text}</span>
            </motion.button>
          );
        })}
      </div>
      <p role="status" className="mt-3 min-h-5 text-sm">
        {solved !== null ? (
          <span className="font-bold text-drei-deep">Richtig! Dein Gewinn wartet schon.</span>
        ) : wrong.length ? (
          <span className="font-medium text-red-600">Leider falsch. Versuch es noch einmal!</span>
        ) : null}
      </p>
      {solved !== null && <ContinueButton onClick={onDone}>Gewinn sichern</ContinueButton>}
    </div>
  );
}
