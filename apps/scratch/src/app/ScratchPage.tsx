import { useMemo, useState } from 'react';
import { fmcgDemoConfig } from '../config/campaigns/fmcgDemo';
import { resolvePrize } from '../lib/prizeResolver';
import { ScratchCanvas } from './ScratchCanvas';
import { GameShell } from './GameShell';

const config = fmcgDemoConfig;

export default function ScratchPage() {
  const [engineReady, setEngineReady] = useState(false);

  // Bumped on every new round so the card gets a freshly resolved prize.
  const [roundKey, setRoundKey] = useState(0);
  const segmentIndex = useMemo(() => resolvePrize(config.prizes.segments).index, [roundKey]);

  return (
    <GameShell config={config} onReset={() => setRoundKey((k) => k + 1)}>
      {({ dispatch }) => (
        <>
          <ScratchCanvas
            config={config}
            segmentIndex={segmentIndex}
            onReady={() => setEngineReady(true)}
            onRevealStart={() => dispatch({ type: 'SPIN_START' })}
            onRevealEnd={(segment) => dispatch({ type: 'SPIN_END', segment })}
          />
          <p className="app__hint">{engineReady ? 'Drag to scratch the card' : 'Loading…'}</p>
        </>
      )}
    </GameShell>
  );
}
