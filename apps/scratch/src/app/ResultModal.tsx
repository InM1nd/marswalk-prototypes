import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import type { GameConfig, ResolvedPrize } from './reducer';
import { track } from '../lib/analytics';
import { playWin } from '../lib/sound';

interface ResultModalProps {
  config: GameConfig;
  segment: ResolvedPrize;
  analyticsPrefix?: 'scratch' | 'lotto';
  onContinue: () => void;
}

export function ResultModal({ config, segment, analyticsPrefix = 'scratch', onContinue }: ResultModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    track(`${analyticsPrefix}_result`, {
      campaignId: config.campaignId,
      isWin: segment.prize.isWin,
    });
    if (!segment.prize.isWin) return;

    playWin();
    const end = Date.now() + 900;
    const primary = config.branding.primaryColor;
    const secondary = config.branding.secondaryColor ?? '#ffffff';
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: [primary, secondary, '#ffffff'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: [primary, secondary, '#ffffff'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [segment, config, analyticsPrefix]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(segment.prize.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`modal-backdrop${segment.prize.isWin ? ' modal-backdrop--win' : ''}`}>
      <div className="modal" role="dialog" aria-modal="true">
        <h2 className="modal__title">
          {segment.prize.isWin ? config.copy.resultWinTitle : config.copy.resultLoseTitle}
        </h2>
        <p className="modal__description">{segment.prize.description}</p>

        {segment.prize.isWin && (
          <button type="button" className="modal__code" onClick={handleCopy}>
            {segment.prize.code}
            <span className="modal__code-hint">{copied ? 'Copied!' : 'Tap to copy'}</span>
          </button>
        )}

        <button type="button" className="btn btn--primary" onClick={onContinue}>
          {segment.prize.isWin
            ? (config.copy.claimButtonLabel ?? 'Claim it')
            : (config.copy.continueButtonLabel ?? 'Continue')}
        </button>
      </div>
    </div>
  );
}
