import { useEffect, useState, type FormEvent } from 'react';
import confetti from 'canvas-confetti';
import type { PlinkoConfig, PlinkoSlot } from '../config/schema';

interface ResultScreenProps {
  config: PlinkoConfig;
  result: PlinkoSlot;
  onRetry: () => void;
}

type Phase = 'prize' | 'lead' | 'submitted';

export function ResultScreen({ config, result, onRetry }: ResultScreenProps) {
  const [phase, setPhase] = useState<Phase>('prize');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const end = Date.now() + 1000;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 50,
        origin: { x: 0, y: 0.7 },
        colors: [config.branding.primaryColor, config.branding.secondaryColor, config.branding.accentColor],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 50,
        origin: { x: 1, y: 0.7 },
        colors: [config.branding.primaryColor, config.branding.secondaryColor, config.branding.accentColor],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [result.id, config.branding]);

  const handleLeadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    if (!consent) {
      setError('Consent is required to receive your prize');
      return;
    }
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('[lead:submitted]', { campaignId: config.campaignId, prize: result.prize, email });
    setSubmitting(false);
    setPhase('submitted');
  };

  return (
    <div className="overlay overlay--soft">
      <div className="panel">
        {phase === 'prize' && (
          <>
            <p className="panel__eyebrow">{config.copy.resultTitle}</p>
            <h1 className="panel__title panel__title--prize">{result.prize}</h1>
            <p className="panel__text">Slot {result.label} — claim it below.</p>
            <button type="button" className="btn" onClick={() => setPhase('lead')}>
              Claim prize
            </button>
            <button type="button" className="btn btn--ghost" onClick={onRetry}>
              {config.copy.retryButtonLabel}
            </button>
          </>
        )}

        {phase === 'lead' && (
          <form className="lead-form" onSubmit={handleLeadSubmit} noValidate>
            <p className="panel__eyebrow">{result.prize}</p>
            <h2 className="lead-form__title">{config.copy.leadFormTitle}</h2>
            <label className="lead-form__field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="lead-form__consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>{config.leadForm.consentText}</span>
            </label>
            {error && <em className="lead-form__error">{error}</em>}
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Sending…' : config.copy.leadFormSubmitLabel}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onRetry}>
              {config.copy.retryButtonLabel}
            </button>
          </form>
        )}

        {phase === 'submitted' && (
          <>
            <p className="panel__eyebrow">YOU'RE ALL SET</p>
            <h1 className="panel__title">Prize sent</h1>
            <p className="panel__text">
              We logged <strong>{result.prize}</strong> for <strong>{email}</strong>.
            </p>
            <button type="button" className="btn" onClick={onRetry}>
              {config.copy.retryButtonLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
