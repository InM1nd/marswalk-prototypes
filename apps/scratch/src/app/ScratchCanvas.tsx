import { useEffect, useRef, useState } from 'react';
import { ScratchEngine } from '../engine/ScratchEngine';
import type { CampaignConfig, PrizeSlot } from '../config/schema';

interface ScratchCanvasProps {
  config: CampaignConfig;
  segmentIndex: number;
  onReady?: () => void;
  onRevealStart?: () => void;
  onRevealEnd?: (segment: PrizeSlot) => void;
  onScratchProgress?: (percent: number) => void;
  interactive?: boolean;
}

export function ScratchCanvas({
  config,
  segmentIndex,
  onReady,
  onRevealStart,
  onRevealEnd,
  onScratchProgress,
  interactive = true,
}: ScratchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ScratchEngine | null>(null);
  const [ready, setReady] = useState(false);
  const progressRef = useRef(onScratchProgress);
  progressRef.current = onScratchProgress;
  const startRef = useRef(onRevealStart);
  startRef.current = onRevealStart;
  const endRef = useRef(onRevealEnd);
  endRef.current = onRevealEnd;

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new ScratchEngine({
      container: containerRef.current,
      config,
      onReady: () => {
        setReady(true);
        onReady?.();
      },
      onRevealStart: () => startRef.current?.(),
      onRevealEnd: (segment) => endRef.current?.(segment),
      onScratchProgress: (p) => progressRef.current?.(p),
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
    if (ready) engineRef.current?.reveal(segmentIndex);
  }, [ready, segmentIndex]);

  useEffect(() => {
    if (ready) engineRef.current?.updateConfig(config);
  }, [ready, config]);

  return (
    <div
      ref={containerRef}
      className="scratch-canvas"
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    />
  );
}
