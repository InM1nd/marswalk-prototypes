import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import type { GameConfig, ResolvedPrize } from './reducer';
import { track } from '../lib/analytics';
import { onColor } from '../lib/color';
import { playWin } from '../lib/sound';

interface ResultModalProps {
  config: GameConfig;
  segment: ResolvedPrize;
  analyticsPrefix?: 'scratch' | 'lotto';
  onContinue: () => void;
}

export function ResultModal({ config, segment, analyticsPrefix = 'scratch', onContinue }: ResultModalProps) {
  const [copied, setCopied] = useState(false);
  const isWin = segment.prize.isWin;
  const accent = segment.color ?? config.branding.primaryColor;

  useEffect(() => {
    track(`${analyticsPrefix}_result`, {
      campaignId: config.campaignId,
      isWin: segment.prize.isWin,
    });
    if (!segment.prize.isWin) return;

    playWin();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // secondaryColor is a near-black background tone — confetti reads better in the prize/brand hues.
    const colors = [accent, config.branding.primaryColor, '#ffffff', '#ffd56b'];
    confetti({ particleCount: 90, spread: 80, startVelocity: 42, origin: { x: 0.5, y: 0.45 }, colors });
    const end = Date.now() + 900;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [segment, config, analyticsPrefix, accent]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(segment.prize.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`modal-backdrop${isWin ? ' modal-backdrop--win' : ''}`}>
      <div className={`modal${isWin ? ' modal--win' : ' modal--lose'}`} role="dialog" aria-modal="true">
        <div
          className="prize-badge"
          style={{
            ['--seg' as string]: isWin ? accent : '#3a3a46',
            ['--on-seg' as string]: isWin ? onColor(accent) : '#ffffff',
          }}
        >
          {isWin ? (segment.label ?? '★') : '↻'}
        </div>
        <h2 className="modal__title">{isWin ? config.copy.resultWinTitle : config.copy.resultLoseTitle}</h2>
        <p className="modal__description">{segment.prize.description}</p>

        {isWin && (
          <button type="button" className="ticket" onClick={handleCopy}>
            <span className="ticket__code">{segment.prize.code}</span>
            <span className="ticket__hint">{copied ? 'Copied ✓' : 'Tap to copy'}</span>
          </button>
        )}

        <button type="button" className={`btn ${isWin ? 'btn--primary' : 'btn--ghost'}`} onClick={onContinue}>
          {isWin ? (config.copy.claimButtonLabel ?? 'Claim it') : (config.copy.continueButtonLabel ?? 'Continue')}
        </button>
      </div>
    </div>
  );
}
