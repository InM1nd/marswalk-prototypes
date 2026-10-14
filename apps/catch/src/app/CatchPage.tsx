import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { dmBlackFridayConfig } from '../config/campaigns/dmBlackFriday';
import { DmAsset, DmLogo } from '../components/assets/DmAssets';
import { AssetStyleContext, type AssetStyle } from '../components/assets/assetStyles';
import { StylePicker } from './StylePicker';
import { unlockAudio } from '../engine/sound';
import { CatchEngine } from '../engine/CatchEngine';
import { useGameStore } from '../store/gameStore';
import { DemoBar } from './DemoBar';
import { GameCanvas } from './GameCanvas';
import { HUD } from './HUD';
import { StartScreen } from './StartScreen';
import { ResultScreen } from './ResultScreen';

function bestScoreKey(campaignId: string): string {
  return `catch-best-${campaignId}`;
}

export default function CatchPage() {
  const config = dmBlackFridayConfig;
  const engineRef = useRef<CatchEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [assetStyle, setAssetStyle] = useState<AssetStyle>('svg');
  const [styleLoading, setStyleLoading] = useState(false);
  const [styleError, setStyleError] = useState('');
  const status = useGameStore((s) => s.status);
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const [best, setBest] = useState(() =>
    Number(localStorage.getItem(bestScoreKey(config.campaignId)) ?? 0),
  );

  useEffect(() => {
    if (status !== 'gameover' || score <= best) return;
    setBest(score);
    localStorage.setItem(bestScoreKey(config.campaignId), String(score));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleStart = () => {
    if (!engineReady) return;
    unlockAudio();
    engineRef.current?.start();
  };

  const handleStyleChange = async (style: AssetStyle) => {
    if (!engineReady || styleLoading || !engineRef.current) return;
    setStyleLoading(true);
    setStyleError('');
    try {
      await engineRef.current.setAssetStyle(style);
      setAssetStyle(style);
    } catch {
      setStyleError('Stil konnte nicht geladen werden. Bitte erneut versuchen.');
    } finally {
      setStyleLoading(false);
    }
  };

  const brandVars = {
    '--brand-primary': config.branding.primaryColor,
    '--brand-secondary': config.branding.secondaryColor,
    '--brand-font': `'${config.branding.fontFamily}', system-ui, sans-serif`,
  } as CSSProperties;

  return (
    <AssetStyleContext.Provider value={assetStyle}>
      <div className="app" style={brandVars}>
        <DemoBar target={config.prize.threshold} />
        <StylePicker
          value={assetStyle}
          onChange={handleStyleChange}
          disabled={!engineReady || styleLoading}
          loading={styleLoading}
          error={styleError}
        />
        <main className="app__stage">
          <aside className="campaign-intro">
            <div className="campaign-brand">
              <DmLogo />
              <span>BLACK FRIDAY SPECIAL EDITION</span>
            </div>
            <h2>
              Dein Korb.
              <br />
              Dein Glück.<span>Dein Black Friday.</span>
            </h2>
            <p>
              Deine Lieblingsprodukte. Ein Korb voller Vorteile.
              <br />
              Fang dir <b>−15% auf deinen Einkauf</b> und
              <br />
              <b>100 Extra PAYBACK Punkte.</b>
            </p>
            <div className="campaign-stats">
              <div>
                <strong>30</strong>
                <small>SEKUNDEN</small>
              </div>
              <div>
                <strong>3</strong>
                <small>LEBEN</small>
              </div>
              <div>
                <strong>1</strong>
                <small>DEIN BONUS</small>
              </div>
            </div>
            <p className="campaign-fineprint">
              Eine spielbare Kampagnenidee für dm Österreich.
              <br />
              Konzeptdemo von marswalk · Kein gültiges Rabattangebot.
            </p>
            <DmAsset kind="coupon" className="campaign-trail" />
          </aside>
          <div className={`game-frame${combo >= 5 && status === 'playing' ? ' is-combo' : ''}`}>
            <GameCanvas
              config={config}
              engineRef={engineRef}
              onReady={() => setEngineReady(true)}
            />
            {combo >= 5 && status === 'playing' && <div className="combo-rim" />}
            {status === 'playing' && <HUD config={config} />}
            {status === 'idle' && (
              <StartScreen config={config} onStart={handleStart} disabled={!engineReady} />
            )}
            {status === 'gameover' && (
              <ResultScreen config={config} score={score} best={best} onRetry={handleStart} />
            )}
            {status !== 'playing' && (
              <div className="game-footer">dm GLÜCKSKORB · BLACK FRIDAY</div>
            )}
          </div>
        </main>
      </div>
    </AssetStyleContext.Provider>
  );
}
