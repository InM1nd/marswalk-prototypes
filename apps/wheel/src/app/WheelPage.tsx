import { useEffect, useRef, useState } from 'react';
import { CAMPAIGN_PRESETS, presetById, type CampaignPresetId } from '../config/campaigns';
import { resolvePrize } from '../lib/prizeResolver';
import type { CampaignConfig } from '../config/schema';
import type { WheelEngine } from '../engine/WheelEngine';
import { WheelCanvas } from './WheelCanvas';
import { GameShell } from './GameShell';
import { ConfigPanel } from './ConfigPanel';
import { track } from '../lib/analytics';
import { clearSpun, hasSpun, markSpun } from '../lib/session';
import { isMuted, playTick, setMuted, unlockAudio } from '../lib/sound';

function initialPreset(): { id: CampaignPresetId; config: CampaignConfig } {
  const fromQuery = new URLSearchParams(window.location.search).get('campaign');
  const preset = presetById(fromQuery ?? 'fmcg-demo');
  return { id: preset.id, config: preset.config };
}

export default function WheelPage() {
  const boot = initialPreset();
  const [presetId, setPresetId] = useState<CampaignPresetId>(boot.id);
  const [config, setConfig] = useState<CampaignConfig>(boot.config);
  const [panelOpen, setPanelOpen] = useState(false);
  const [muted, setMutedState] = useState(() => isMuted());
  const [blocked, setBlocked] = useState(() => hasSpun(boot.config.campaignId));
  const wheelEngineRef = useRef<WheelEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    if (engineReady) wheelEngineRef.current?.updateConfig(config);
  }, [engineReady, config]);

  useEffect(() => {
    setBlocked(hasSpun(config.campaignId));
  }, [config.campaignId]);

  const selectPreset = (id: CampaignPresetId) => {
    const preset = CAMPAIGN_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setConfig(preset.config);
    const url = new URL(window.location.href);
    url.searchParams.set('campaign', id);
    window.history.replaceState({}, '', url);
  };

  const resetSession = () => {
    clearSpun(config.campaignId);
    setBlocked(false);
  };

  return (
    <GameShell config={config}>
      {({ state, dispatch }) => {
        const handleSpinClick = () => {
          if (state.status !== 'idle' || !engineReady || blocked) return;
          unlockAudio();
          const { index } = resolvePrize(config.wheel.segments);
          track('spin_start', { campaignId: config.campaignId, segmentIndex: index });
          dispatch({ type: 'SPIN_START' });
          markSpun(config.campaignId);
          setBlocked(true);
          wheelEngineRef.current?.spin(index);
        };

        const presetsLocked = state.status !== 'idle';
        const soundEnabled = config.sound?.enabled !== false;

        return (
          <>
            <nav className="demo-bar" aria-label="Demo controls">
              <a className="demo-bar__hub" href="/">← Hub</a>
              <span className="demo-bar__tag">Demo</span>
              <div className="preset-switcher" role="group" aria-label="Campaign vertical">
                {CAMPAIGN_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-switcher__btn${presetId === preset.id ? ' is-active' : ''}`}
                    disabled={presetsLocked}
                    onClick={() => selectPreset(preset.id)}
                    title={preset.vertical}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {blocked && state.status === 'idle' && (
                <button
                  type="button"
                  className="demo-bar__chip demo-bar__chip--warn"
                  onClick={resetSession}
                  title="Demo limit: 1 spin / 24h on this device (prototype anti-replay). Click to reset the demo session."
                >
                  1 spin used · Reset
                </button>
              )}
              {soundEnabled && (
                <button
                  type="button"
                  className="demo-bar__chip"
                  onClick={() => {
                    const next = !muted;
                    setMuted(next);
                    setMutedState(next);
                  }}
                  aria-pressed={!muted}
                >
                  {muted ? 'Sound off' : 'Sound on'}
                </button>
              )}
              <button
                type="button"
                className={`demo-bar__chip${panelOpen ? ' is-active' : ''}`}
                onClick={() => setPanelOpen((o) => !o)}
                aria-expanded={panelOpen}
              >
                ⚙ Customize
              </button>
              <a className="demo-bar__chip" href={`${import.meta.env.BASE_URL}styles.html`}>
                Styles
              </a>
            </nav>

            {panelOpen && (
              <aside className="config-drawer" aria-label="Customize this wheel">
                <div className="config-drawer__head">
                  <h2>Customize this wheel</h2>
                  <button type="button" className="config-drawer__close" onClick={() => setPanelOpen(false)} aria-label="Close">
                    ✕
                  </button>
                </div>
                <ConfigPanel config={config} onChange={setConfig} disabled={state.status !== 'idle'} />
              </aside>
            )}

            <WheelCanvas
              config={config}
              engineRef={wheelEngineRef}
              onReady={() => setEngineReady(true)}
              onSegmentTick={() => {
                if (soundEnabled) playTick();
              }}
              onSpinEnd={(segment) => dispatch({ type: 'SPIN_END', segment })}
            />
            <button
              type="button"
              className="btn btn--primary btn--spin"
              onClick={handleSpinClick}
              disabled={state.status !== 'idle' || !engineReady || blocked}
            >
              {!engineReady
                ? 'Loading…'
                : blocked && state.status === 'idle'
                  ? 'Already spun'
                  : state.status === 'spinning'
                    ? 'Spinning…'
                    : config.copy.spinButtonLabel}
            </button>
          </>
        );
      }}
    </GameShell>
  );
}
