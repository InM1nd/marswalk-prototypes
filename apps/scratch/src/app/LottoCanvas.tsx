import { useEffect, useRef, useState } from 'react';
import { LottoEngine } from '../engine/LottoEngine';
import type { LottoConfig } from '../config/lottoSchema';
import type { LottoResult } from '../lib/lottoResolver';

interface LottoCanvasProps {
  config: LottoConfig;
  result: LottoResult;
  onReady?: () => void;
  onRevealStart?: () => void;
  onRevealEnd?: (result: LottoResult) => void;
}

export function LottoCanvas({ config, result, onReady, onRevealStart, onRevealEnd }: LottoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LottoEngine | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new LottoEngine({
      container: containerRef.current,
      config,
      onReady: () => {
        setReady(true);
        onReady?.();
      },
      onRevealStart,
      onRevealEnd,
    });
    engineRef.current = engine;
    engine.mount();

    return () => {
      engine.destroy();
      engineRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.campaignId]);

  // Re-arms the board with a freshly resolved grid whenever `result` changes
  // (new round). Guarded on `ready` so this never races the still-in-flight
  // mount() — same pattern as ScratchCanvas/WheelCanvas.
  useEffect(() => {
    if (ready) engineRef.current?.reveal(result);
  }, [ready, result]);

  return <div ref={containerRef} className="wheel-canvas" />;
}
