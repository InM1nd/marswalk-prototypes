import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { PlinkoConfig, PlinkoSlot } from '../config/schema';

interface ResultScreenProps {
  config: PlinkoConfig;
  result: PlinkoSlot;
  onRetry: () => void;
}

export function ResultScreen({ config, result, onRetry }: ResultScreenProps) {
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

  return (
    <div className="overlay overlay--soft">
      <div className="panel">
        <p className="panel__eyebrow">{config.copy.resultTitle}</p>
        <h1 className="panel__title panel__title--prize">{result.prize}</h1>
        <p className="panel__text">Slot {result.label} · ready for lead capture or QR claim.</p>
        <button type="button" className="btn" onClick={onRetry}>
          {config.copy.retryButtonLabel}
        </button>
      </div>
    </div>
  );
}
