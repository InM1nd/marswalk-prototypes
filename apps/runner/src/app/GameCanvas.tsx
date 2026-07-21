import { useEffect, useRef } from 'react';
import { RunnerEngine } from '../engine/RunnerEngine';
import type { RunnerConfig } from '../config/schema';

interface GameCanvasProps {
  config: RunnerConfig;
  onReady?: () => void;
  engineRef: React.MutableRefObject<RunnerEngine | null>;
}

export function GameCanvas({ config, onReady, engineRef }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new RunnerEngine({ container: containerRef.current, config, onReady });
    engineRef.current = engine;
    engine.mount();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.campaignId]);

  return <div ref={containerRef} className="runner-canvas" />;
}
