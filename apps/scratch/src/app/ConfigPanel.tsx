import type { CampaignConfig, PrizeSlot } from '../config/schema';

interface ConfigPanelProps {
  config: CampaignConfig;
  onChange: (config: CampaignConfig) => void;
  disabled?: boolean;
}

function weightPercent(segments: PrizeSlot[], index: number): string {
  const total = segments.reduce((sum, s) => sum + s.weight, 0);
  if (total <= 0) return '0%';
  return `${Math.round((segments[index].weight / total) * 100)}%`;
}

export function ConfigPanel({ config, onChange, disabled }: ConfigPanelProps) {
  const updateBranding = (patch: Partial<CampaignConfig['branding']>) =>
    onChange({ ...config, branding: { ...config.branding, ...patch } });

  const updateCopy = (patch: Partial<CampaignConfig['copy']>) =>
    onChange({ ...config, copy: { ...config.copy, ...patch } });

  const updateSegment = (index: number, patch: Partial<PrizeSlot>) => {
    const segments = config.prizes.segments.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ ...config, prizes: { ...config.prizes, segments } });
  };

  const updateSegmentPrize = (index: number, patch: Partial<PrizeSlot['prize']>) => {
    const segments = config.prizes.segments.map((s, i) =>
      i === index ? { ...s, prize: { ...s.prize, ...patch } } : s,
    );
    onChange({ ...config, prizes: { ...config.prizes, segments } });
  };

  return (
    <fieldset className="config-panel" disabled={disabled}>
      <section className="config-panel__section">
        <h3 className="config-panel__heading">Branding</h3>
        <div className="config-panel__row">
          <label className="config-panel__field config-panel__field--color">
            <span>Primary</span>
            <input
              type="color"
              value={config.branding.primaryColor}
              onChange={(e) => updateBranding({ primaryColor: e.target.value })}
            />
          </label>
          <label className="config-panel__field config-panel__field--color">
            <span>Secondary</span>
            <input
              type="color"
              value={config.branding.secondaryColor}
              onChange={(e) => updateBranding({ secondaryColor: e.target.value })}
            />
          </label>
          <label className="config-panel__field">
            <span>Center label</span>
            <input
              type="text"
              value={config.branding.centerLabel}
              onChange={(e) => updateBranding({ centerLabel: e.target.value })}
            />
          </label>
        </div>
        <label className="config-panel__field">
          <span>Logo URL</span>
          <input
            type="text"
            value={config.branding.logoUrl ?? ''}
            onChange={(e) => updateBranding({ logoUrl: e.target.value || undefined })}
          />
        </label>
        <label className="config-panel__field">
          <span>Foil hint</span>
          <input
            type="text"
            value={config.copy.scratchHint}
            onChange={(e) => updateCopy({ scratchHint: e.target.value })}
          />
        </label>
      </section>

      <section className="config-panel__section">
        <h3 className="config-panel__heading">Prize weights</h3>
        {config.prizes.segments.map((segment, i) => (
          <div className="config-panel__segment" key={segment.id}>
            <input
              type="color"
              className="config-panel__swatch"
              value={segment.color}
              onChange={(e) => updateSegment(i, { color: e.target.value })}
              aria-label="Prize color"
            />
            <input
              type="text"
              className="config-panel__segment-label"
              value={segment.label}
              maxLength={20}
              onChange={(e) => updateSegment(i, { label: e.target.value })}
            />
            <input
              type="number"
              className="config-panel__segment-weight"
              min={0}
              max={100}
              value={segment.weight}
              onChange={(e) => updateSegment(i, { weight: Number(e.target.value) })}
            />
            <span className="config-panel__weight-pct">{weightPercent(config.prizes.segments, i)}</span>
            <label className="config-panel__win-toggle">
              <input
                type="checkbox"
                checked={segment.prize.isWin}
                onChange={(e) => updateSegmentPrize(i, { isWin: e.target.checked })}
              />
              Win
            </label>
            {segment.prize.isWin && (
              <input
                type="text"
                className="config-panel__segment-code"
                value={segment.prize.code}
                onChange={(e) => updateSegmentPrize(i, { code: e.target.value })}
                placeholder="Code"
              />
            )}
          </div>
        ))}
      </section>
    </fieldset>
  );
}
