import { useEffect, useRef } from 'react';
import { WheelEngine } from '../engine/WheelEngine';
import type { CampaignConfig, WheelSegment } from '../config/schema';

interface WheelCanvasProps {
  config: CampaignConfig;
  onReady?: () => void;
  onSpinStart?: () => void;
  onSpinEnd?: (segment: WheelSegment) => void;
  engineRef?: React.MutableRefObject<WheelEngine | null>;
}

export function WheelCanvas({ config, onReady, onSpinStart, onSpinEnd, engineRef }: WheelCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new WheelEngine({
      container: containerRef.current,
      config,
      onReady,
      onSpinStart,
      onSpinEnd,
    });
    if (engineRef) engineRef.current = engine;
    engine.mount();

    return () => {
      engine.destroy();
      if (engineRef) engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.campaignId]);

  return <div ref={containerRef} className="wheel-canvas" />;
}
