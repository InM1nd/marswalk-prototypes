import { useEffect, useRef } from 'react';
import { CatchEngine } from '../engine/CatchEngine';
import type { CatchConfig } from '../config/schema';

interface GameCanvasProps {
  config: CatchConfig;
  onReady?: () => void;
  engineRef: React.MutableRefObject<CatchEngine | null>;
}

export function GameCanvas({ config, onReady, engineRef }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new CatchEngine({ container: containerRef.current, config, onReady });
    engineRef.current = engine;
    engine.mount();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.campaignId]);

  return <div ref={containerRef} className="game-canvas" />;
}
