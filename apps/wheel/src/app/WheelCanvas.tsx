import { useEffect, useRef } from 'react';
import { WheelEngine } from '../engine/WheelEngine';
import type { CampaignConfig, WheelSegment } from '../config/schema';

interface WheelCanvasProps {
  config: CampaignConfig;
  onReady?: () => void;
  onSpinStart?: () => void;
  onSpinEnd?: (segment: WheelSegment) => void;
  onSegmentTick?: (segmentIndex: number) => void;
  engineRef?: React.MutableRefObject<WheelEngine | null>;
}

export function WheelCanvas({
  config,
  onReady,
  onSpinStart,
  onSpinEnd,
  onSegmentTick,
  engineRef,
}: WheelCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef(onSegmentTick);
  tickRef.current = onSegmentTick;

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new WheelEngine({
      container: containerRef.current,
      config,
      onReady,
      onSpinStart,
      onSpinEnd,
      onSegmentTick: (i) => tickRef.current?.(i),
    });
    if (engineRef) engineRef.current = engine;
    void engine.mount();

    return () => {
      engine.destroy();
      if (engineRef) engineRef.current = null;
    };
    // Remount only when campaign identity changes (logo/assets may differ).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.campaignId]);

  return <div ref={containerRef} className="wheel-canvas" />;
}
