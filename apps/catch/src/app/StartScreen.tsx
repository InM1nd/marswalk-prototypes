import type { CatchConfig } from '../config/schema';
import { DmAsset, DmLogo, DM_PRODUCTS } from '../components/assets/DmAssets';

export function StartScreen({
  config,
  onStart,
  disabled,
}: {
  config: CatchConfig;
  onStart: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="overlay overlay--start">
      <div className="start-content">
        <div className="start-brand">
          <DmLogo />
          <span>
            BLACK FRIDAY
            <br />
            <b>GLÜCKSKORB</b>
          </span>
          <span className="edition">
            SPECIAL
            <br />
            EDITION
          </span>
        </div>
        <div className="start-hero" aria-hidden="true">
          <div className="hero-orbit" />
          <DmAsset kind="balea" className="hero-product hero-product--balea" />
          <DmAsset kind="alverde" className="hero-product hero-product--alverde" />
          <DmAsset kind="ebelin" className="hero-product hero-product--ebelin" />
          <DmAsset kind="coupon" className="hero-product hero-product--coupon" />
          <DmAsset kind="basket" className="hero-basket" />
          <span className="hero-spark hero-spark--one">✦</span>
          <span className="hero-spark hero-spark--two">✧</span>
          <span className="hero-reward">
            DEIN BONUS
            <br />
            <b>−15%</b>
          </span>
        </div>
        <p className="eyebrow">30 SEKUNDEN. DEIN GLÜCKSFANG.</p>
        <h1>{config.copy.title}</h1>
        <p className="start-copy">
          Lieblingsprodukte fangen.
          <br />
          Black Friday Bonus sichern.
        </p>
        <div className="product-lineup" aria-label="Produkte und Punkte">
          {DM_PRODUCTS.map((p) => (
            <div className="product-mini" key={p.kind}>
              <DmAsset kind={p.kind} alt={`${p.name} ${p.detail}`} />
              <strong>+{p.points}</strong>
              <span>{p.name}</span>
            </div>
          ))}
        </div>
        <div className="hazard-hint">
          <DmAsset kind="bomb" />
          <DmAsset kind="box" />
          <span>
            Preisteufel & Kartons? <b>Lieber ausweichen!</b>
          </span>
        </div>
        <button type="button" className="btn btn--primary" disabled={disabled} onClick={onStart}>
          {disabled ? 'SPIEL WIRD GELADEN …' : config.copy.startButtonLabel}
          <span aria-hidden="true">→</span>
        </button>
        <p className="start-help">
          Wischen, Maus bewegen oder ← → drücken.
          <br />
          <b>250 Punkte</b> direkt gewinnen · <b>150 Punkte</b> nach 30 s reichen auch.
        </p>
      </div>
    </div>
  );
}
