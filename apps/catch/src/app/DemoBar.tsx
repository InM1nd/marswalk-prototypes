import { useGameStore } from '../store/gameStore';
import { unlockAudio } from '../engine/sound';

export function DemoBar({ target }: { target: number }) {
  const muted = useGameStore((s) => s.muted);
  const god = useGameStore((s) => s.godMode);
  return (
    <nav className="demo-bar" aria-label="marswalk Demo-Steuerung">
      <a className="demo-bar__hub" href="/">
        marswalk<span> / campaign lab</span>
      </a>
      <div className="demo-bar__controls">
        <span className="demo-bar__tag">KONZEPTDEMO</span>
        <button type="button" onClick={() => useGameStore.getState().demoWin(target)}>
          Instant Win (Demo) <span aria-hidden="true">↗</span>
        </button>
        <button
          type="button"
          aria-label="Toggle God Mode (No Damage)"
          aria-pressed={god}
          onClick={() => useGameStore.getState().toggleGodMode()}
        >
          God Mode: {god ? 'AN' : 'AUS'}
        </button>
        <button
          type="button"
          aria-label={muted ? 'Ton einschalten' : 'Ton ausschalten'}
          aria-pressed={!muted}
          onClick={() => {
            if (muted) unlockAudio();
            useGameStore.getState().toggleMuted();
          }}
        >
          Ton {muted ? 'AUS' : 'AN'}
        </button>
      </div>
    </nav>
  );
}
