import type { PlinkoConfig } from '../config/schema';

interface StartScreenProps {
  config: PlinkoConfig;
  onDrop: () => void;
  disabled?: boolean;
}

export function StartScreen({ config, onDrop, disabled }: StartScreenProps) {
  return (
    <div className="overlay">
      <div className="panel">
        <p className="panel__eyebrow">3D ENGAGEMENT DEMO</p>
        <h1 className="panel__title">{config.copy.title}</h1>
        <p className="panel__text">{config.copy.subtitle}</p>
        <button type="button" className="btn" onClick={onDrop} disabled={disabled}>
          {config.copy.dropButtonLabel}
        </button>
      </div>
    </div>
  );
}
