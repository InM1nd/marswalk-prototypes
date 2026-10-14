'use client';

import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Check, Copy, ExternalLink, Link2, Loader2, Volume1, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { copyText } from '../lib/copyText';
import type { YamahaAudioEngine } from '../lib/yamaha-audio-engine';

const CODE = 'YAMAHA-BEAT-10';
const STORE_URL = 'https://europe.yamaha.com/de/';
const VIP_CUTOFF = 600;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Props {
  engine: YamahaAudioEngine;
  /** User's own cutoff, restored when the modal closes. */
  cutoff: number;
  shareUrl: string;
  onClose: () => void;
}

function CopyButton({ text, label, icon: Icon, className }: { text: string; label: string; icon: typeof Copy; className: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        }
      }}
      className={className}
    >
      {done ? <Check size={16} /> : <Icon size={16} />} {done ? 'Kopiert!' : label}
    </button>
  );
}

export function YamahaRewardModal({ engine, cutoff, shareUrl, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; consent?: string }>({});
  const [state, setState] = useState<'form' | 'busy' | 'done'>('form');
  const closeRef = useRef<HTMLButtonElement>(null);

  // "Club VIP room": the beat keeps running, muffled behind the low-pass, and opens back up on close.
  useEffect(() => {
    engine.setCutoff(VIP_CUTOFF, 0.35);
    return () => engine.setCutoff(cutoff, 0.25);
  }, [engine, cutoff]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      email: EMAIL_RE.test(email.trim()) ? undefined : 'Bitte gib eine gültige E-Mail-Adresse ein.',
      consent: consent ? undefined : 'Bitte stimme den Teilnahmebedingungen zu.',
    };
    setErrors(next);
    if (next.email || next.consent) return;
    setState('busy');
    // Mocked submit: no network call in the prototype.
    setTimeout(() => {
      setState('done');
      const base = { colors: ['#7B2CBF', '#9D4EDD', '#F5B700', '#FFD166', '#FFFFFF'], disableForReducedMotion: true, zIndex: 100 };
      confetti({ ...base, particleCount: 110, spread: 85, origin: { y: 0.55 } });
      setTimeout(() => confetti({ ...base, particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } }), 180);
      setTimeout(() => confetti({ ...base, particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } }), 180);
    }, 700);
  };

  const primary = 'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-purple-2 to-purple px-5 py-4 font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_24px_rgb(123_44_191/0.45)] transition active:translate-y-px disabled:opacity-70';

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Yamaha Gutschein"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="chassis relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[26px] p-6 pb-8 sm:rounded-[26px]"
      >
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Schließen" className="keycap absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center text-white/70">
          <X size={16} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/yamaha-beats/og.jpg" alt="" className="-mx-6 -mt-6 mb-4 h-36 w-[calc(100%+3rem)] max-w-none object-cover object-[75%_50%] [mask-image:linear-gradient(#000_55%,transparent)]" />
        <p className="flex items-center gap-2 font-mono text-[10.5px] text-cyan">
          <Volume1 size={13} /> VIP ROOM · LPF {VIP_CUTOFF} Hz
        </p>
        <h2 className="mt-3 pr-10 text-[1.9rem] leading-[1.05] font-bold tracking-tight">
          Dein Sound.
          <br />
          <span className="bg-gradient-to-r from-purple-2 to-gold bg-clip-text text-transparent">Dein Rabatt.</span>
        </h2>
        <p className="mt-2 text-white/65">-10% auf Yamaha Synths, Audio &amp; Instrumente.</p>

        {state !== 'done' ? (
          <form onSubmit={submit} noValidate className="mt-6">
            <label htmlFor="ym-email" className="silk mb-2 block">
              E-Mail für deinen Gutscheincode
            </label>
            <input
              id="ym-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'ym-email-err' : undefined}
              placeholder="name@beispiel.de"
              className="well w-full rounded-xl border border-white/10 px-4 py-3.5 text-base text-white placeholder:text-white/30 focus:border-purple-2 focus:outline-none"
            />
            {errors.email && <p id="ym-email-err" className="mt-1.5 text-xs text-orange">{errors.email}</p>}
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-white/60">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-purple-2" />
              <span>Ich stimme den Teilnahmebedingungen zu und möchte Neuigkeiten und Angebote von Yamaha Music Europe per E-Mail erhalten (DSGVO-konform, jederzeit widerrufbar).</span>
            </label>
            {errors.consent && <p className="mt-1.5 text-xs text-orange">{errors.consent}</p>}
            <button type="submit" disabled={state === 'busy'} className={`mt-5 ${primary}`}>
              {state === 'busy' && <Loader2 size={18} className="animate-spin" />}
              {state === 'busy' ? 'Wird gesendet …' : 'Gutschein freischalten'}
            </button>
          </form>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <p className="silk mb-2">Dein Gutscheincode</p>
            <div className="flex items-stretch gap-2">
              <code className="well flex-1 rounded-xl border border-dashed border-gold/50 px-3 py-3.5 text-center font-mono text-[15px] font-bold tracking-wider text-gold select-all">{CODE}</code>
              <CopyButton text={CODE} label="Kopieren" icon={Copy} className="keycap inline-flex min-w-32 items-center justify-center gap-1.5 px-3 text-sm font-semibold text-white" />
            </div>
            <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className={`mt-4 ${primary}`}>
              Im Yamaha Music Store einlösen <ExternalLink size={16} />
            </a>
            <CopyButton
              text={shareUrl}
              label="Link zu deinem Beat kopieren"
              icon={Link2}
              className="keycap mt-3 flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-white/85"
            />
            <p className="mt-4 text-center text-xs text-white/40">Code auch an {email} gesendet (Demo).</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
