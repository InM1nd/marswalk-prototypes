import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { lunchDemoConfig } from '../config/campaigns/lunchDemo';
import { unlockAudio } from '../engine/sound';
import { CatchEngine } from '../engine/CatchEngine';
import { useGameStore } from '../store/gameStore';
import { DemoBar } from './DemoBar';
import { GameCanvas } from './GameCanvas';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { ResultScreen } from './ResultScreen';

function bestScoreKey(campaignId: string): string {
  return `catch-best-${campaignId}`;
}

export default function CatchPage() {
  const config = lunchDemoConfig;
  const engineRef = useRef<CatchEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const status = useGameStore((s) => s.status);
  const score = useGameStore((s) => s.score);
  const [best, setBest] = useState(() => Number(localStorage.getItem(bestScoreKey(config.campaignId)) ?? 0));

  useEffect(() => {
    if (status !== 'gameover' || score <= best) return;
    setBest(score);
    localStorage.setItem(bestScoreKey(config.campaignId), String(score));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleStart = () => {
    if (!engineReady) return;
    unlockAudio();
    engineRef.current?.start();
  };

  const brandVars = {
    '--brand-primary': config.branding.primaryColor,
    '--brand-secondary': config.branding.secondaryColor,
    '--brand-font': `'${config.branding.fontFamily}', system-ui, sans-serif`,
  } as CSSProperties;

  return (
    <div className="app" style={brandVars}>
      <DemoBar />
      <main className="app__stage">
        <div className="game-frame">
          <GameCanvas config={config} engineRef={engineRef} onReady={() => setEngineReady(true)} />
          {status === 'playing' && <HUD config={config} />}
          {status === 'idle' && <StartScreen config={config} onStart={handleStart} disabled={!engineReady} />}
          {status === 'gameover' && <ResultScreen config={config} score={score} best={best} onRetry={handleStart} />}
        </div>
      </main>
    </div>
  );
}
