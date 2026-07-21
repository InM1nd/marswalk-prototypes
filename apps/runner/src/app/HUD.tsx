import { comboMultiplier, useGameStore } from '../store/gameStore';

// Selectors instead of a whole-store subscription — this re-renders on every
// score/time tick (60fps while playing), so it must not drag other fields in.
export function HUD() {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const timeLeft = useGameStore((s) => s.timeLeft);
  const muted = useGameStore((s) => s.muted);
  const toggleMuted = useGameStore((s) => s.toggleMuted);
  const mult = comboMultiplier(combo);

  return (
    <div className="hud">
      <span className="hud__metric"><span>RIDES</span><strong>{score}</strong></span>
      <span className="hud__metric hud__timer"><span>ETA</span><strong>{Math.ceil(timeLeft)}s</strong></span>
      {combo > 1 && (
        <span className="hud__metric hud__combo"><span>COMBO</span><strong>x{mult} · {combo}</strong></span>
      )}
      <button type="button" className="hud__mute" onClick={toggleMuted} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? 'SOUND OFF' : 'SOUND ON'}
      </button>
    </div>
  );
}
