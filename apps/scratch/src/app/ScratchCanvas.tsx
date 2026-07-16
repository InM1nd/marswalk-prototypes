import { useEffect, useRef, useState } from 'react';
import { ScratchEngine } from '../engine/ScratchEngine';
import type { CampaignConfig, PrizeSlot } from '../config/schema';

interface ScratchCanvasProps {
  config: CampaignConfig;
  segmentIndex: number;
  onReady?: () => void;
  onRevealStart?: () => void;
  onRevealEnd?: (segment: PrizeSlot) => void;
}

export function ScratchCanvas({ config, segmentIndex, onReady, onRevealStart, onRevealEnd }: ScratchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ScratchEngine | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new ScratchEngine({
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

  // Re-arms the card (new prize, fresh cover) whenever the resolved segment
  // changes — e.g. a new round after "Play again". Guarded on `ready` so this
  // never races the still-in-flight mount() (see WheelCanvas/App for the same pattern).
  useEffect(() => {
    if (ready) engineRef.current?.reveal(segmentIndex);
  }, [ready, segmentIndex]);

  return <div ref={containerRef} className="wheel-canvas" />;
}
