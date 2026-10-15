import { useEffect, useRef, useState, type FormEvent } from 'react';
import confetti from 'canvas-confetti';
import type { CatchConfig } from '../config/schema';
import { useGameStore } from '../store/gameStore';
import { sfx } from '../engine/sound';
import { DmAsset, DmLogo } from '../components/assets/DmAssets';

export function ResultScreen({
  config,
  score,
  best,
  onRetry,
}: {
  config: CatchConfig;
  score: number;
  best: number;
  onRetry: () => void;
}) {
  const won = useGameStore((s) => s.prizeUnlocked);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState('');
  const [copyStatus, setCopyStatus] = useState('Code kopieren');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    if (!won) return;
    if (!useGameStore.getState().muted) sfx.win();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      confetti({
        particleCount: 100,
        spread: 85,
        startVelocity: 38,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#E4003A', '#009FE3', '#FFD100'],
        disableForReducedMotion: true,
      });
  }, [won]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDone(true);
  };
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(config.prize.code);
      setCopyStatus('Kopiert!');
    } catch {
      setCopyStatus('Bitte Code markieren & kopieren');
    }
  };
  return (
    <div className={`overlay overlay--result${won ? ' overlay--win' : ''}`}>
      <section className="result-card" aria-labelledby="result-title">
        <div className="result-brand">
          <DmLogo />
          <span>DEIN GLÜCKSKORB</span>
        </div>
        {won ? (
          <>
            <div className="reward-medallion">
              <span>BLACK FRIDAY BONUS</span>
              <b>−15%</b>
              <i>+ 100 PAYBACK Punkte</i>
            </div>
            <h2 id="result-title" ref={heading} tabIndex={-1}>
              {done ? 'Dein Bonus ist freigeschaltet!' : config.copy.winTitle}
            </h2>
            <p className="reward-description">
              −15% auf deinen gesamten Einkauf
              <br />
              <b>+ 100 Extra PAYBACK Punkte</b>
            </p>
            {!done ? (
              <form onSubmit={submit} className="lead-form">
                <label className="lead-field" htmlFor="bonus-email">
                  Deine E-Mail-Adresse
                </label>
                <input
                  id="bonus-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="du@beispiel.at"
                />
                <label className="consent">
                  <input type="checkbox" name="consent" required />
                  <span>
                    {config.copy.consentText}{' '}
                    <a href="https://www.dm.at/datenschutz-218900" target="_blank" rel="noreferrer">
                      Datenschutz
                    </a>
                  </span>
                </label>
                <button className="btn btn--primary" type="submit">
                  {config.copy.leadFormSubmitLabel}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : (
              <>
                <p className="claim-confirmation" role="status">
                  Danke! Du kannst deinen Demo-Code jetzt kopieren.
                </p>
                <button className="reward-code" type="button" onClick={copy}>
                  <code>{config.prize.code}</code>
                  <span aria-live="polite">{copyStatus}</span>
                </button>
              </>
            )}
            <p className="demo-note">
              Konzeptdemo: kein gültiger dm-Gutschein.
              <br />
              Deine E-Mail-Adresse wird nicht übermittelt oder gespeichert.
            </p>
          </>
        ) : (
          <>
            <DmAsset kind="basket" className="result-basket" />
            <p className="eyebrow">DEIN ERGEBNIS</p>
            <h2 id="result-title" ref={heading} tabIndex={-1}>
              {config.copy.loseTitle}
            </h2>
            <p className="result-score">
              {score}
              <span>PUNKTE</span>
            </p>
            <p className="result-hint">
              {useGameStore.getState().lives === 0
                ? 'Drei Preisteufel waren einer zu viel.'
                : 'Nur ein paar Lieblingsprodukte fehlen noch.'}
              <br />
              Ab {config.prize.minimumScore} Punkten nach 30 Sekunden wartet dein Bonus.
            </p>
            <p className="best-score">Dein Rekord: {Math.max(best, score)} Punkte</p>
          </>
        )}
        <button
          type="button"
          className={`btn ${won ? 'btn--ghost' : 'btn--primary'}`}
          onClick={onRetry}
        >
          {config.copy.retryButtonLabel}
          <span aria-hidden="true">↻</span>
        </button>
      </section>
    </div>
  );
}
