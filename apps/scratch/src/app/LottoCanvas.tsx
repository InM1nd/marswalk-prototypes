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
  interactive?: boolean;
}

export function LottoCanvas({
  config,
  result,
  onReady,
  onRevealStart,
  onRevealEnd,
  interactive = true,
}: LottoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LottoEngine | null>(null);
  const [ready, setReady] = useState(false);
  const startRef = useRef(onRevealStart);
  startRef.current = onRevealStart;
  const endRef = useRef(onRevealEnd);
  endRef.current = onRevealEnd;

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new LottoEngine({
      container: containerRef.current,
      config,
      onReady: () => {
        setReady(true);
        onReady?.();
      },
      onRevealStart: () => startRef.current?.(),
      onRevealEnd: (r) => endRef.current?.(r),
    });
    engineRef.current = engine;
    void engine.mount();

    return () => {
      engine.destroy();
      engineRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.campaignId]);

  useEffect(() => {
    if (ready) engineRef.current?.reveal(result);
  }, [ready, result]);

  return (
    <div
      ref={containerRef}
      className="scratch-canvas scratch-canvas--lotto"
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    />
  );
}
