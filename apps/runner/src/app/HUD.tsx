import type { RunnerConfig } from '../config/schema';
import { comboMultiplier, useGameStore } from '../store/gameStore';

// Selectors instead of a whole-store subscription — this re-renders on every
// score/time tick (60fps while playing), so it must not drag other fields in.
export function HUD({ config }: { config: RunnerConfig }) {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const timeLeft = useGameStore((s) => s.timeLeft);
  const unlocked = useGameStore((s) => s.prizeUnlocked);
  const mult = comboMultiplier(combo);
  const { threshold, label } = config.prize;
  const progress = Math.min(1, score / threshold);
  const secs = Math.ceil(timeLeft);

  return (
    <div className="hud">
      <div className="hud__row">
        <span className="hud__pill">
          <span className="hud__label">Score</span>
          <strong>{score}</strong>
        </span>
        {mult > 1 && <span className="hud__combo" key={mult}>×{mult} combo</span>}
        <span className={`hud__pill${secs <= 10 ? ' hud__pill--hot' : ''}`}>
          <span className="hud__label">Time</span>
          <strong>0:{String(secs).padStart(2, '0')}</strong>
        </span>
      </div>
      <div className={`hud__prize${unlocked ? ' is-unlocked' : ''}`}>
        <span className="hud__prize-track">
          <span className="hud__prize-fill" style={{ width: `${progress * 100}%` }} />
        </span>
        <span className="hud__prize-badge">{unlocked ? `${label} unlocked` : `${label} at ${threshold}`}</span>
      </div>
    </div>
  );
}
