import { useMemo, useState } from 'react';
import { fmcgLottoConfig } from '../config/campaigns/fmcgLotto';
import { resolveLottoGrid, type LottoResult } from '../lib/lottoResolver';
import { LottoCanvas } from './LottoCanvas';
import { GameShell } from './GameShell';
import type { ResolvedPrize } from './reducer';

const config = fmcgLottoConfig;

function toResolvedPrize(result: LottoResult): ResolvedPrize {
  if (result.isWin && result.symbol) {
    return {
      prize: { code: result.symbol.prize.code, description: result.symbol.prize.description, isWin: true },
    };
  }
  return { prize: { code: '', description: config.copy.resultLoseDescription, isWin: false } };
}

function resolveRound(): LottoResult {
  const { rows, cols, loseWeight } = config.grid;
  return resolveLottoGrid(config.symbols, rows * cols, loseWeight);
}

export default function LottoPage() {
  const [engineReady, setEngineReady] = useState(false);

  // Bumped on every new round so the board gets a freshly resolved grid.
  const [roundKey, setRoundKey] = useState(0);
  const result = useMemo(resolveRound, [roundKey]);

  return (
    <GameShell config={config} onReset={() => setRoundKey((k) => k + 1)}>
      {({ dispatch }) => (
        <>
          <LottoCanvas
            config={config}
            result={result}
            onReady={() => setEngineReady(true)}
            onRevealStart={() => dispatch({ type: 'SPIN_START' })}
            onRevealEnd={(r) => dispatch({ type: 'SPIN_END', segment: toResolvedPrize(r) })}
          />
          <p className="app__hint">{engineReady ? 'Drag to scratch each tile' : 'Loading…'}</p>
        </>
      )}
    </GameShell>
  );
}
