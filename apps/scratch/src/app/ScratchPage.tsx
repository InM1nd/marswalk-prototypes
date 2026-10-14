import { useEffect, useMemo, useRef, useState } from 'react';
import { CAMPAIGN_PRESETS, presetById, type CampaignPresetId } from '../config/campaigns';
import { resolvePrize } from '../lib/prizeResolver';
import type { CampaignConfig, PrizeSlot } from '../config/schema';
import { ScratchCanvas } from './ScratchCanvas';
import { GameShell } from './GameShell';
import { ConfigPanel } from './ConfigPanel';
import { DemoBar } from './DemoBar';
import { track } from '../lib/analytics';
import { clearScratched, hasScratched, markScratched } from '../lib/session';
import { isMuted, playGrit, setMuted, unlockAudio } from '../lib/sound';

function initialPreset(): { id: CampaignPresetId; config: CampaignConfig } {
  const fromQuery = new URLSearchParams(window.location.search).get('campaign');
  const preset = presetById(fromQuery ?? 'fmcg-demo');
  return { id: preset.id, config: preset.config };
}

export default function ScratchPage() {
  const boot = initialPreset();
  const [presetId, setPresetId] = useState<CampaignPresetId>(boot.id);
  const [config, setConfig] = useState<CampaignConfig>(boot.config);
  const [engineReady, setEngineReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [muted, setMutedState] = useState(() => isMuted());
  const [blocked, setBlocked] = useState(() => hasScratched(boot.config.campaignId));
  const [roundKey, setRoundKey] = useState(0);
  const segmentIndex = useMemo(() => resolvePrize(config.prizes.segments).index, [roundKey, config]);
  const lastGrit = useRef(0);

  useEffect(() => {
    setBlocked(hasScratched(config.campaignId));
  }, [config.campaignId]);

  const selectPreset = (id: CampaignPresetId) => {
    const preset = CAMPAIGN_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setConfig(preset.config);
    setRoundKey((k) => k + 1);
    const url = new URL(window.location.href);
    url.searchParams.set('campaign', id);
    window.history.replaceState({}, '', url);
  };

  return (
    <GameShell
      config={config}
      analyticsPrefix="scratch"
      onReset={() => {
        setRoundKey((k) => k + 1);
      }}
    >
      {({ state, dispatch }) => {
        const presetsLocked = state.status !== 'idle' && state.status !== 'spinning';
        const soundEnabled = config.sound?.enabled !== false;

        const handleRevealStart = () => {
          if (blocked) return;
          unlockAudio();
          track('scratch_start', { campaignId: config.campaignId });
          markScratched(config.campaignId);
          setBlocked(true);
          dispatch({ type: 'SPIN_START' });
        };

        const handleProgress = (percent: number) => {
          track('scratch_progress', { campaignId: config.campaignId, percent: Math.round(percent * 100) });
          if (!soundEnabled) return;
          const now = performance.now();
          if (now - lastGrit.current > 70) {
            lastGrit.current = now;
            playGrit();
          }
        };

        const handleRevealEnd = (segment: PrizeSlot) => {
          dispatch({ type: 'SPIN_END', segment });
        };

        return (
          <>
            <DemoBar
              mode="card"
              presets={CAMPAIGN_PRESETS.map((p) => ({ id: p.id, label: p.label, title: p.vertical }))}
              activePresetId={presetId}
              onSelectPreset={(id) => selectPreset(id as CampaignPresetId)}
              presetsLocked={presetsLocked}
              blocked={blocked && state.status === 'idle'}
              onResetSession={() => {
                clearScratched(config.campaignId);
                setBlocked(false);
              }}
              sound={
                soundEnabled
                  ? {
                      muted,
                      onToggle: () => {
                        setMuted(!muted);
                        setMutedState(!muted);
                      },
                    }
                  : undefined
              }
            >
              <button
                type="button"
                className={`demo-bar__chip${panelOpen ? ' is-active' : ''}`}
                onClick={() => setPanelOpen((o) => !o)}
                aria-expanded={panelOpen}
              >
                ⚙ Customize
              </button>
            </DemoBar>

            {panelOpen && (
              <aside className="config-drawer" aria-label="Customize this card">
                <div className="config-drawer__head">
                  <h2>Customize this card</h2>
                  <button type="button" className="config-drawer__close" onClick={() => setPanelOpen(false)} aria-label="Close">
                    ✕
                  </button>
                </div>
                <ConfigPanel config={config} onChange={setConfig} disabled={state.status !== 'idle'} />
              </aside>
            )}

            <div className={`scratch-frame${blocked && state.status === 'idle' ? ' scratch-frame--blocked' : ''}`}>
              <ScratchCanvas
                config={config}
                segmentIndex={segmentIndex}
                onReady={() => setEngineReady(true)}
                onRevealStart={handleRevealStart}
                onScratchProgress={handleProgress}
                onRevealEnd={handleRevealEnd}
                interactive={!blocked || state.status === 'spinning'}
              />
            </div>
            <p className="app__hint">
              {!engineReady
                ? 'Loading…'
                : blocked && state.status === 'idle'
                  ? 'Already played — reset the demo session to play again'
                  : 'Drag your finger or mouse across the foil'}
            </p>
          </>
        );
      }}
    </GameShell>
  );
}
