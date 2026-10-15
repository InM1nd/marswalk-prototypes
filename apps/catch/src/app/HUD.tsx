import type { CatchConfig } from '../config/schema';
import { comboMultiplier, useGameStore } from '../store/gameStore';
import { Heart } from '../components/assets/DmAssets';

export function HUD({ config }: { config: CatchConfig }) {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const secs = useGameStore((s) => Math.ceil(s.timeLeft));
  const lives = useGameStore((s) => s.lives);
  const slow = useGameStore((s) => Math.ceil(s.slowLeft));
  const god = useGameStore((s) => s.godMode);
  return (
    <div className="hud">
      <div className="hud__glass">
        <div className="hud__score">
          <span>PUNKTE</span>
          <strong>
            {score}
            <small> / {config.prize.threshold}</small>
          </strong>
          <div
            className="hud__track"
            role="progressbar"
            aria-label="Punkte bis zum Bonus"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={config.prize.threshold}
          >
            <i
              style={{
                width: `${Math.min(100, (score / config.prize.threshold) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div
          className={`hud__timer${secs <= 5 ? ' hud__timer--hot' : ''}`}
          aria-label={`Noch ${secs} Sekunden`}
        >
          <span>ZEIT</span>
          <strong>00:{String(secs).padStart(2, '0')}</strong>
        </div>
        <div className="hud__lives" aria-label={`${lives} von 3 Leben`}>
          <span>LEBEN</span>
          <div>
            {[0, 1, 2].map((i) => (
              <Heart key={i} filled={i < lives} />
            ))}
          </div>
        </div>
      </div>
      <p className="hud__goal">Ziel: 250 Punkte für deinen Black Friday Code</p>
      {comboMultiplier(combo) > 1 ? (
        <div className="hud__combo">
          2× COMBO! <span>DM Einkaufs-Rausch</span>
        </div>
      ) : (
        <div className="hud__streak">{combo}/5 Fänge zum Einkaufs-Rausch</div>
      )}
      {slow > 0 && (
        <div className="hud__effect" role="status">
          Karton erwischt · {Math.ceil(slow)} s langsamer
        </div>
      )}
      {god && <div className="hud__effect hud__effect--god">God Mode · Kein Schaden</div>}
      <div className="play-hint">
        Korb bewegen & Lieblingsprodukte fangen <span>← &nbsp; →</span>
      </div>
    </div>
  );
}
