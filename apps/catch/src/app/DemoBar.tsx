import { useGameStore } from '../store/gameStore';

/** Presenter-only controls, visually separate from the consumer widget. */
export function DemoBar() {
  const muted = useGameStore((s) => s.muted);
  const toggleMuted = useGameStore((s) => s.toggleMuted);
  return (
    <nav className="demo-bar" aria-label="Demo controls">
      <a className="demo-bar__hub" href="/">← Hub</a>
      <span className="demo-bar__tag">Demo</span>
      <button type="button" className="demo-bar__chip" onClick={toggleMuted} aria-pressed={!muted}>
        {muted ? 'Sound off' : 'Sound on'}
      </button>
    </nav>
  );
}
