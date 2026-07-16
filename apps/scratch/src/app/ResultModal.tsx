import { useState } from 'react';
import type { GameConfig, ResolvedPrize } from './reducer';

interface ResultModalProps {
  config: GameConfig;
  segment: ResolvedPrize;
  onContinue: () => void;
}

export function ResultModal({ config, segment, onContinue }: ResultModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(segment.prize.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
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
          {segment.prize.isWin ? 'Claim it' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
