import type { RunnerConfig } from '../config/schema';

interface StartScreenProps {
  config: RunnerConfig;
  onStart: () => void;
  disabled: boolean;
}

export function StartScreen({ config, onStart, disabled }: StartScreenProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <p className="modal__eyebrow">MOBILITY DEMO</p>
        <h1 className="modal__title">{config.copy.title}</h1>
        <p className="modal__description">{config.copy.subtitle}</p>
        <p className="modal__description modal__description--hint">
          TAP / SPACE TO HOP · DOUBLE JUMP CLEARS TALL BARRIERS · BANK RIDE TOKENS
        </p>
        <button type="button" className="btn btn--primary" onClick={onStart} disabled={disabled}>
          {disabled ? 'LOADING…' : config.copy.startButtonLabel}
        </button>
      </div>
    </div>
  );
}
