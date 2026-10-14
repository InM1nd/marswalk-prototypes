import { ASSET_STYLES, type AssetStyle } from '../components/assets/assetStyles';

export function StylePicker({
  value,
  onChange,
  disabled,
  loading,
  error,
}: {
  value: AssetStyle;
  onChange: (style: AssetStyle) => void;
  disabled: boolean;
  loading: boolean;
  error: string;
}) {
  const index = ASSET_STYLES.findIndex((s) => s.id === value);
  return (
    <section className="style-picker" aria-label="Asset-Stil auswählen">
      <span className="style-picker__label">
        ART DIRECTION <small>LIVE WECHSELN</small>
      </span>
      <div className="style-picker__control">
        <button
          type="button"
          aria-label="Vorheriger Stil"
          disabled={disabled}
          onClick={() =>
            onChange(ASSET_STYLES[(index + ASSET_STYLES.length - 1) % ASSET_STYLES.length].id)
          }
        >
          ←
        </button>
        <label>
          <span className="sr-only">Asset-Stil</span>
          <select
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value as AssetStyle)}
          >
            {ASSET_STYLES.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-label="Nächster Stil"
          disabled={disabled}
          onClick={() => onChange(ASSET_STYLES[(index + 1) % ASSET_STYLES.length].id)}
        >
          →
        </button>
      </div>
      <span
        className={`style-picker__status${error ? ' style-picker__status--error' : ''}`}
        role="status"
      >
        {error ||
          (loading
            ? 'Stil wird geladen …'
            : `${index + 1} / ${ASSET_STYLES.length} · ${ASSET_STYLES[index].description}`)}
      </span>
    </section>
  );
}
