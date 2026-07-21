import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { RunnerConfig } from '../config/schema';

interface GameOverScreenProps {
  config: RunnerConfig;
  score: number;
  best: number;
  onRetry: () => void;
}

export function GameOverScreen({ config, score, best, onRetry }: GameOverScreenProps) {
  // Capture on mount so parent best-update doesn't flip the banner mid-animation.
  const isNewBest = score > 0 && score >= best;

  useEffect(() => {
    if (!isNewBest) return;
    const end = Date.now() + 900;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.75 },
        colors: [config.branding.primaryColor, config.branding.secondaryColor, '#f7f5ed'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.75 },
        colors: [config.branding.primaryColor, config.branding.secondaryColor, '#f7f5ed'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [isNewBest, config.branding.primaryColor, config.branding.secondaryColor]);

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <p className="modal__eyebrow">{isNewBest ? 'NEW CITY BEST' : 'MOBILITY DEMO'}</p>
        <h1 className="modal__title">{config.copy.gameOverTitle}</h1>
        <p className="modal__eyebrow">RIDES BANKED</p>
        <p className="modal__score">{score}</p>
        <p className="modal__description">{isNewBest ? 'PERSONAL BEST UNLOCKED' : `BEST RUN · ${best}`}</p>
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          {config.copy.retryButtonLabel}
        </button>
      </div>
    </div>
  );
}
