import { useEffect, useRef, useState } from 'react';
import { fmcgDemoConfig } from '../config/campaigns/fmcgDemo';
import { resolvePrize } from '../lib/prizeResolver';
import type { CampaignConfig } from '../config/schema';
import type { WheelEngine } from '../engine/WheelEngine';
import { WheelCanvas } from './WheelCanvas';
import { GameShell } from './GameShell';
import { ConfigPanel } from './ConfigPanel';

export default function WheelPage() {
  const [config, setConfig] = useState<CampaignConfig>(fmcgDemoConfig);
  const [panelOpen, setPanelOpen] = useState(false);
  const wheelEngineRef = useRef<WheelEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);

  // Live-editing panel: push every config edit straight into the running
  // engine so the wheel updates as you type, no remount. Guarded on `ready`
  // so this never races the still-in-flight mount() (see the onReady wiring
  // in App.tsx's advisor-flagged fix).
  useEffect(() => {
    if (engineReady) wheelEngineRef.current?.updateConfig(config);
  }, [engineReady, config]);

  return (
    <GameShell config={config}>
      {({ state, dispatch }) => {
        const handleSpinClick = () => {
          if (state.status !== 'idle' || !engineReady) return;
          const { index } = resolvePrize(config.wheel.segments);
          dispatch({ type: 'SPIN_START' });
          wheelEngineRef.current?.spin(index);
        };

        return (
          <>
            <button type="button" className="config-toggle" onClick={() => setPanelOpen((o) => !o)}>
              {panelOpen ? 'Hide customization ▲' : '⚙ Customize this wheel ▼'}
            </button>
            {panelOpen && (
              <ConfigPanel config={config} onChange={setConfig} disabled={state.status !== 'idle'} />
            )}

            <WheelCanvas
              config={config}
              engineRef={wheelEngineRef}
              onReady={() => setEngineReady(true)}
              onSpinEnd={(segment) => dispatch({ type: 'SPIN_END', segment })}
            />
            <button
              type="button"
              className="btn btn--primary btn--spin"
              onClick={handleSpinClick}
              disabled={state.status !== 'idle' || !engineReady}
            >
              {!engineReady ? 'Loading…' : state.status === 'spinning' ? 'Spinning…' : config.copy.spinButtonLabel}
            </button>
          </>
        );
      }}
    </GameShell>
  );
}
