import { useEffect, useState, type FormEvent } from 'react';
import confetti from 'canvas-confetti';
import type { RunnerConfig } from '../config/schema';
import { sfx } from '../engine/sound';
import { useGameStore } from '../store/gameStore';

interface ResultScreenProps {
  config: RunnerConfig;
  score: number;
  best: number;
  onRetry: () => void;
}

type Step = 'result' | 'lead' | 'done';

export function ResultScreen({ config, score, best, onRetry }: ResultScreenProps) {
  const { copy, prize, branding } = config;
  // Read once on mount so the parent's best-score update can't flip the screen mid-animation.
  const [won] = useState(() => useGameStore.getState().prizeUnlocked);
  const [isNewBest] = useState(() => score > 0 && score > best);
  const [step, setStep] = useState<Step>('result');
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!won) return;
    if (!useGameStore.getState().muted) sfx.win();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = [branding.primaryColor, branding.secondaryColor, '#ffffff'];
    confetti({ particleCount: 80, spread: 75, startVelocity: 38, origin: { x: 0.5, y: 0.4 }, colors });
  }, [won, branding.primaryColor, branding.secondaryColor]);

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(prize.code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Prototype: no backend — the webhook URL in the config is where a real build would POST.
    setTimeout(() => {
      setSubmitting(false);
      setStep('done');
    }, 700);
  };

  if (step === 'lead') {
    return (
      <div className="overlay overlay--win">
        <form className="card lead-form" onSubmit={handleSubmit}>
          <div className="lead-form__prize">
            <span className="lead-form__prize-dot" aria-hidden="true" />
            {prize.label} · <code>{prize.code}</code>
          </div>
          <h2 className="card__title card__title--sm">{copy.leadFormTitle}</h2>
          <label className="lead-form__field">
            <span>Email</span>
            <input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="lead-form__consent">
            <input type="checkbox" required />
            <span>{copy.consentText}</span>
          </label>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Sending…' : copy.leadFormSubmitLabel}
          </button>
          {config.leadForm.webhookUrl && <p className="lead-form__pipeline">Demo · would POST to {config.leadForm.webhookUrl}</p>}
        </form>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="overlay overlay--win">
        <div className="card">
          <svg className="check" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="24" />
            <path d="M15 27 l7 7 l15 -16" />
          </svg>
          <h2 className="card__title card__title--sm">Your code is on its way</h2>
          <p className="card__text">We sent <b>{prize.code}</b> to {email}. See you on the road!</p>
          <button type="button" className="btn btn--ghost" onClick={onRetry}>{copy.retryButtonLabel}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`overlay${won ? ' overlay--win' : ''}`}>
      <div className={`card${won ? ' card--win' : ''}`}>
        {won ? (
          <>
            <div className="prize-badge">{prize.label}</div>
            <h2 className="card__title">{copy.winTitle}</h2>
            <p className="card__text">{prize.description}</p>
            <button type="button" className="ticket" onClick={handleCopy}>
              <span className="ticket__code">{prize.code}</span>
              <span className="ticket__hint">{copied ? 'Copied ✓' : 'Tap to copy'}</span>
            </button>
            <button type="button" className="btn btn--primary btn--big" onClick={() => setStep('lead')}>{copy.claimButtonLabel}</button>
            <button type="button" className="btn btn--link" onClick={onRetry}>{copy.retryButtonLabel} · score {score}</button>
          </>
        ) : (
          <>
            <p className="card__eyebrow">{isNewBest ? 'New personal best' : `Best · ${Math.max(best, score)}`}</p>
            <h2 className="card__title">{copy.loseTitle}</h2>
            <p className="score">{score}</p>
            <div className="miss">
              <span className="miss__track"><span className="miss__fill" style={{ width: `${Math.min(100, (score / prize.threshold) * 100)}%` }} /></span>
              <span>{Math.max(0, prize.threshold - score)} more points for {prize.label}</span>
            </div>
            <button type="button" className="btn btn--primary btn--big" onClick={onRetry}>{copy.retryButtonLabel}</button>
          </>
        )}
      </div>
    </div>
  );
}
