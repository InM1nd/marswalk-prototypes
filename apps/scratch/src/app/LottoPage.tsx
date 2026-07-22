import { useMemo, useState } from 'react';
import { LOTTO_PRESETS, lottoPresetById, type LottoPresetId } from '../config/campaigns/lottoIndex';
import type { LottoConfig } from '../config/lottoSchema';
import { resolveLottoGrid, type LottoResult } from '../lib/lottoResolver';
import { LottoCanvas } from './LottoCanvas';
import { GameShell } from './GameShell';
import type { ResolvedPrize } from './reducer';
import { clearScratched, hasScratched, markScratched } from '../lib/session';
import { isMuted, playGrit, setMuted, unlockAudio } from '../lib/sound';
import { track } from '../lib/analytics';

function initial(): { id: LottoPresetId; config: LottoConfig } {
  const fromQuery = new URLSearchParams(window.location.search).get('campaign');
  const preset = lottoPresetById(fromQuery ?? 'fmcg-lotto-demo');
  return { id: preset.id, config: preset.config };
}

function toResolvedPrize(result: LottoResult, config: LottoConfig): ResolvedPrize {
  if (result.isWin && result.symbol) {
    return {
      prize: { code: result.symbol.prize.code, description: result.symbol.prize.description, isWin: true },
    };
  }
  return { prize: { code: '', description: config.copy.resultLoseDescription, isWin: false } };
}

export default function LottoPage() {
  const boot = initial();
  const [presetId, setPresetId] = useState<LottoPresetId>(boot.id);
  const [config, setConfig] = useState<LottoConfig>(boot.config);
  const [engineReady, setEngineReady] = useState(false);
  const [muted, setMutedState] = useState(() => isMuted());
  const [blocked, setBlocked] = useState(() => hasScratched(boot.config.campaignId));
  const [roundKey, setRoundKey] = useState(0);

  const result = useMemo(() => {
    const { rows, cols, loseWeight } = config.grid;
    return resolveLottoGrid(config.symbols, rows * cols, loseWeight);
  }, [roundKey, config]);

  const selectPreset = (id: LottoPresetId) => {
    const preset = LOTTO_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setConfig(preset.config);
    setRoundKey((k) => k + 1);
    setBlocked(hasScratched(preset.config.campaignId));
    const url = new URL(window.location.href);
    url.searchParams.set('campaign', id);
    window.history.replaceState({}, '', url);
  };

  return (
    <GameShell
      config={config}
      analyticsPrefix="lotto"
      onReset={() => setRoundKey((k) => k + 1)}
    >
      {({ state, dispatch }) => {
        const presetsLocked = state.status !== 'idle' && state.status !== 'spinning';
        const soundEnabled = config.sound?.enabled !== false;

        return (
          <>
            <div className="chrome-row">
              <div className="preset-switcher" role="group" aria-label="Campaign vertical">
                {LOTTO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-switcher__btn${presetId === preset.id ? ' is-active' : ''}`}
                    disabled={presetsLocked}
                    onClick={() => selectPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {soundEnabled && (
                <button
                  type="button"
                  className="mute-toggle"
                  onClick={() => {
                    const next = !muted;
                    setMuted(next);
                    setMutedState(next);
                  }}
                >
                  {muted ? 'Sound off' : 'Sound on'}
                </button>
              )}
            </div>

            {blocked && state.status === 'idle' && (
              <div className="session-banner" role="status">
                <span>Demo limit: 1 play / 24h on this device.</span>
                <button
                  type="button"
                  className="session-banner__reset"
                  onClick={() => {
                    clearScratched(config.campaignId);
                    setBlocked(false);
                  }}
                >
                  Reset demo session
                </button>
              </div>
            )}

            <div className={`scratch-frame${blocked && state.status === 'idle' ? ' scratch-frame--blocked' : ''}`}>
              <LottoCanvas
                config={config}
                result={result}
                onReady={() => setEngineReady(true)}
                interactive={!blocked || state.status === 'spinning'}
                onRevealStart={() => {
                  if (blocked) return;
                  unlockAudio();
                  track('lotto_start', { campaignId: config.campaignId });
                  markScratched(config.campaignId);
                  setBlocked(true);
                  dispatch({ type: 'SPIN_START' });
                  if (soundEnabled) playGrit();
                }}
                onRevealEnd={(r) => dispatch({ type: 'SPIN_END', segment: toResolvedPrize(r, config) })}
              />
            </div>
            <p className="app__hint">
              {!engineReady
                ? 'Loading…'
                : blocked && state.status === 'idle'
                  ? 'Already played — reset session to try again'
                  : 'Drag to scratch each tile'}
            </p>
          </>
        );
      }}
    </GameShell>
  );
}
