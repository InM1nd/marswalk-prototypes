import { fmcgDemoConfig } from '../config/campaigns/fmcgDemo';
import { usePlinkoStore } from '../store/gameStore';
import { PlinkoScene } from '../scene/PlinkoScene';
import { StartScreen } from './StartScreen';
import { ResultScreen } from './ResultScreen';

export function PlinkoPage() {
  const config = fmcgDemoConfig;
  const status = usePlinkoStore((s) => s.status);
  const result = usePlinkoStore((s) => s.result);
  const muted = usePlinkoStore((s) => s.muted);
  const startDrop = usePlinkoStore((s) => s.startDrop);
  const reset = usePlinkoStore((s) => s.reset);
  const toggleMuted = usePlinkoStore((s) => s.toggleMuted);

  return (
    <div className="stage" style={{ ['--brand-primary' as string]: config.branding.primaryColor, ['--brand-secondary' as string]: config.branding.secondaryColor, ['--bg' as string]: config.branding.bgColor }}>
      <PlinkoScene config={config} />

      <header className="hud">
        <div className="hud__brand">
          <span className="hud__mark">MW</span>
          <span>PLINKO · 3D</span>
        </div>
        <button type="button" className="hud__mute" onClick={toggleMuted} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? 'SOUND OFF' : 'SOUND ON'}
        </button>
      </header>

      {status === 'idle' && <StartScreen config={config} onDrop={startDrop} />}
      {status === 'dropping' && (
        <div className="dropping-hint" aria-live="polite">
          WATCH THE DROP
        </div>
      )}
      {status === 'result' && result && (
        <ResultScreen
          config={config}
          result={result}
          onRetry={() => {
            reset();
            // tiny delay so physics unmounts cleanly before next drop
            requestAnimationFrame(() => startDrop());
          }}
        />
      )}
    </div>
  );
}
