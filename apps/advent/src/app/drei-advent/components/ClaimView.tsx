'use client';

import { motion } from 'framer-motion';
import { Check, Copy, ExternalLink, Loader2, Ticket } from 'lucide-react';
import { useState } from 'react';
import { CAMPAIGN, type DoorConfig } from '../data/doors-config';
import { copyText } from '../lib/copyText';
import type { Lead } from '../lib/useAdvent';
import { PrizeIcon } from './Asset';
import { PRIMARY_BTN } from './mechanics/ContinueButton';

interface Props {
  door: DoorConfig;
  lead: Lead | null;
  revealed: boolean;
  onSubmit: (lead: Lead) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ClaimView({ door, lead, revealed, onSubmit }: Props) {
  const [email, setEmail] = useState(lead?.email ?? '');
  const [consent, setConsent] = useState(lead?.consent ?? false);
  const [errors, setErrors] = useState<{ email?: string; consent?: string }>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { prize } = door;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      email: EMAIL_RE.test(email.trim()) ? undefined : 'Bitte gib eine gültige E-Mail-Adresse ein.',
      consent: consent ? undefined : 'Bitte stimme den Teilnahmebedingungen zu.',
    };
    setErrors(next);
    if (next.email || next.consent) return;
    setBusy(true);
    // Mocked submit: no network call in the prototype.
    setTimeout(() => onSubmit({ email: email.trim(), consent }), 700);
  };

  const copy = async () => {
    if (await copyText(prize.code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const summary = (
    <div className="mb-5 flex items-center gap-4 rounded-2xl bg-ice p-4">
      <PrizeIcon icon={door.icon} className="h-16 w-16 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-drei-deep">Dein Gewinn</p>
        <p className="mt-0.5 text-lg leading-snug font-bold">{prize.title}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-purple px-2.5 py-1 text-xs font-bold text-white">
          <Ticket size={13} /> +{prize.tickets} {prize.tickets === 1 ? 'Los' : 'Lose'} für die Verlosung
        </p>
      </div>
    </div>
  );

  if (revealed) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {summary}
        <p className="mb-2 text-sm font-bold">Dein Gewinncode</p>
        <div className="flex items-stretch gap-2">
          <code className="flex-1 rounded-2xl border-2 border-dashed border-drei/50 bg-ice px-3 py-3.5 text-center font-mono text-[15px] font-bold tracking-wider select-all">{prize.code}</code>
          <button
            type="button"
            onClick={copy}
            className={`inline-flex min-w-[8.75rem] items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold text-white transition-colors ${copied ? 'bg-navy' : 'bg-drei hover:bg-drei-deep'}`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Kopiert!' : 'Code kopieren'}
          </button>
        </div>
        <a href={CAMPAIGN.ctaUrl} target="_blank" rel="noopener noreferrer" className={`mt-4 ${PRIMARY_BTN}`}>
          {CAMPAIGN.ctaLabel} <ExternalLink size={17} />
        </a>
        <p className="mt-4 text-center text-xs text-navy/50">Wir haben dir den Code zusätzlich an {lead?.email ?? 'deine E-Mail-Adresse'} gesendet (Demo).</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {summary}
      <label htmlFor="advent-email" className="mb-2 block text-sm font-bold">
        Deine E-Mail-Adresse für den Gewinncode &amp; die Hauptverlosung
      </label>
      <input
        id="advent-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? 'advent-email-err' : undefined}
        placeholder="name@beispiel.at"
        className="w-full rounded-full border-2 border-ice-2 bg-white px-5 py-3.5 text-base placeholder:text-navy/35 focus:border-drei focus:outline-none"
      />
      {errors.email && <p id="advent-email-err" className="mt-1.5 pl-5 text-xs font-medium text-red-600">{errors.email}</p>}

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-navy/75">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-drei" />
        <span>Ich stimme den Teilnahmebedingungen zu und möchte exklusive Drei-Angebote erhalten (DSGVO-konform).</span>
      </label>
      {errors.consent && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.consent}</p>}

      <button type="submit" disabled={busy} className={`mt-5 ${PRIMARY_BTN}`}>
        {busy && <Loader2 size={18} className="animate-spin" />}
        {busy ? 'Wird gesendet …' : 'Gewinncode freischalten'}
      </button>
    </form>
  );
}
