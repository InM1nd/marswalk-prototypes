import { useGameStore } from '../store/gameStore';

/** Presenter-only controls, visually separate from the consumer widget. */
export function DemoBar() {
  const muted = useGameStore((s) => s.muted);
  const toggleMuted = useGameStore((s) => s.toggleMuted);
  const base = import.meta.env.BASE_URL;
  return (
    <nav className="demo-bar" aria-label="Demo controls">
      <a className="demo-bar__hub" href="/">← Hub</a>
      <span className="demo-bar__tag">Demo</span>
      <button type="button" className="demo-bar__chip" onClick={toggleMuted} aria-pressed={!muted}>
        {muted ? 'Sound off' : 'Sound on'}
      </button>
      <a className="demo-bar__chip" href={`${base}styles.html`}>Styles</a>
      <a className="demo-bar__chip" href={`${base}characters.html`}>Characters</a>
    </nav>
  );
}
