import { useEffect, useRef, useState } from 'react';
import { mobilityDemoConfig } from '../config/campaigns/mobilityDemo';
import { unlockAudio } from '../engine/sound';
import { RunnerEngine } from '../engine/RunnerEngine';
import { useGameStore } from '../store/gameStore';
import { GameCanvas } from './GameCanvas';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { GameOverScreen } from './GameOverScreen';

function bestScoreKey(campaignId: string): string {
  return `runner-best-${campaignId}`;
}

export default function RunnerPage() {
  const config = mobilityDemoConfig;
  const engineRef = useRef<RunnerEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const status = useGameStore((s) => s.status);
  const score = useGameStore((s) => s.score);
  const [best, setBest] = useState(() => Number(localStorage.getItem(bestScoreKey(config.campaignId)) ?? 0));

  useEffect(() => {
    if (status !== 'gameover') return;
    if (score > best) {
      setBest(score);
      localStorage.setItem(bestScoreKey(config.campaignId), String(score));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleStart = () => {
    if (!engineReady) return;
    unlockAudio();
    engineRef.current?.start();
  };

  return (
    <div className="app__stage">
      <GameCanvas config={config} engineRef={engineRef} onReady={() => setEngineReady(true)} />
      {status === 'playing' && <HUD />}
      {status === 'idle' && <StartScreen config={config} onStart={handleStart} disabled={!engineReady} />}
      {status === 'gameover' && (
        <GameOverScreen config={config} score={score} best={best} onRetry={handleStart} />
      )}
    </div>
  );
}
