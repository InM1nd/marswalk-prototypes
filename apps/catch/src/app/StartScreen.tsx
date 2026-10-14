import type { CatchConfig } from '../config/schema';

interface StartScreenProps {
  config: CatchConfig;
  onStart: () => void;
  disabled: boolean;
}

export function StartScreen({ config, onStart, disabled }: StartScreenProps) {
  const { copy, prize } = config;
  return (
    <div className="overlay overlay--start">
      <div className="card">
        <p className="card__eyebrow">{copy.eyebrow}</p>
        <h1 className="card__title">{copy.title}</h1>
        <p className="card__text">{copy.subtitle}</p>
        <ul className="howto">
          <li><span className="howto__icon" aria-hidden="true">👉</span>Drag the bag</li>
          <li><span className="howto__icon" aria-hidden="true">🍔</span>Catch the food</li>
          <li><span className="howto__icon" aria-hidden="true">⏰</span>Dodge late clocks</li>
        </ul>
        <div className="prize-chip">
          <span className="prize-chip__badge">{prize.label}</span>
          <span>Score <b>{prize.threshold}</b> to win {prize.title.toLowerCase()}</span>
        </div>
        <button type="button" className="btn btn--primary btn--big" onClick={onStart} disabled={disabled}>
          {disabled ? 'Loading…' : copy.startButtonLabel}
        </button>
      </div>
    </div>
  );
}
