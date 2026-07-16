import type { CampaignConfig, WheelSegment } from '../config/schema';

interface ConfigPanelProps {
  config: CampaignConfig;
  onChange: (config: CampaignConfig) => void;
  disabled?: boolean;
}

const MIN_SEGMENTS = 4;
const MAX_SEGMENTS = 12;

function newSegment(): WheelSegment {
  return {
    id: `s${Date.now()}`,
    label: 'New prize',
    color: '#2a2a36',
    textColor: '#FFFFFF',
    weight: 10,
    prize: { code: 'CODE', description: 'Description', isWin: true },
  };
}

export function ConfigPanel({ config, onChange, disabled }: ConfigPanelProps) {
  const updateBranding = (patch: Partial<CampaignConfig['branding']>) =>
    onChange({ ...config, branding: { ...config.branding, ...patch } });

  const updateCopy = (patch: Partial<CampaignConfig['copy']>) =>
    onChange({ ...config, copy: { ...config.copy, ...patch } });

  const updateLeadForm = (patch: Partial<CampaignConfig['leadForm']>) =>
    onChange({ ...config, leadForm: { ...config.leadForm, ...patch } });

  const updateSegment = (index: number, patch: Partial<WheelSegment>) => {
    const segments = config.wheel.segments.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ ...config, wheel: { ...config.wheel, segments } });
  };

  const updateSegmentPrize = (index: number, patch: Partial<WheelSegment['prize']>) => {
    const segments = config.wheel.segments.map((s, i) =>
      i === index ? { ...s, prize: { ...s.prize, ...patch } } : s,
    );
    onChange({ ...config, wheel: { ...config.wheel, segments } });
  };

  const addSegment = () => {
    if (config.wheel.segments.length >= MAX_SEGMENTS) return;
    onChange({ ...config, wheel: { ...config.wheel, segments: [...config.wheel.segments, newSegment()] } });
  };

  const removeSegment = (index: number) => {
    if (config.wheel.segments.length <= MIN_SEGMENTS) return;
    onChange({ ...config, wheel: { ...config.wheel, segments: config.wheel.segments.filter((_, i) => i !== index) } });
  };

  return (
    <fieldset className="config-panel" disabled={disabled}>
      <section className="config-panel__section">
        <h3 className="config-panel__heading">Branding</h3>
        <div className="config-panel__row">
          <label className="config-panel__field config-panel__field--color">
            <span>Primary</span>
            <input type="color" value={config.branding.primaryColor} onChange={(e) => updateBranding({ primaryColor: e.target.value })} />
          </label>
          <label className="config-panel__field config-panel__field--color">
            <span>Secondary</span>
            <input type="color" value={config.branding.secondaryColor} onChange={(e) => updateBranding({ secondaryColor: e.target.value })} />
          </label>
          <label className="config-panel__field">
            <span>Center label</span>
            <input type="text" value={config.branding.centerLabel} onChange={(e) => updateBranding({ centerLabel: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="config-panel__section">
        <h3 className="config-panel__heading">Copy</h3>
        <label className="config-panel__field">
          <span>Title</span>
          <input type="text" value={config.copy.title} onChange={(e) => updateCopy({ title: e.target.value })} />
        </label>
        <label className="config-panel__field">
          <span>Subtitle</span>
          <input type="text" value={config.copy.subtitle} onChange={(e) => updateCopy({ subtitle: e.target.value })} />
        </label>
        <label className="config-panel__field">
          <span>Spin button label</span>
          <input type="text" value={config.copy.spinButtonLabel} onChange={(e) => updateCopy({ spinButtonLabel: e.target.value })} />
        </label>
        <label className="config-panel__field">
          <span>Win result title</span>
          <input type="text" value={config.copy.resultWinTitle} onChange={(e) => updateCopy({ resultWinTitle: e.target.value })} />
        </label>
        <label className="config-panel__field">
          <span>Lose result title</span>
          <input type="text" value={config.copy.resultLoseTitle} onChange={(e) => updateCopy({ resultLoseTitle: e.target.value })} />
        </label>
        <label className="config-panel__field">
          <span>Lead form title</span>
          <input type="text" value={config.copy.leadFormTitle} onChange={(e) => updateCopy({ leadFormTitle: e.target.value })} />
        </label>
        <label className="config-panel__field">
          <span>Consent text</span>
          <textarea rows={2} value={config.leadForm.consentText} onChange={(e) => updateLeadForm({ consentText: e.target.value })} />
        </label>
      </section>

      <section className="config-panel__section">
        <h3 className="config-panel__heading">
          Segments ({config.wheel.segments.length}/{MAX_SEGMENTS})
        </h3>
        {config.wheel.segments.map((segment, i) => (
          <div className="config-panel__segment" key={segment.id}>
            <input
              type="color"
              className="config-panel__swatch"
              value={segment.color}
              onChange={(e) => updateSegment(i, { color: e.target.value })}
              aria-label="Segment color"
            />
            <input
              type="text"
              className="config-panel__segment-label"
              value={segment.label}
              maxLength={20}
              onChange={(e) => updateSegment(i, { label: e.target.value })}
              aria-label="Segment label"
            />
            <input
              type="number"
              className="config-panel__segment-weight"
              min={0}
              max={100}
              value={segment.weight}
              onChange={(e) => updateSegment(i, { weight: Number(e.target.value) })}
              aria-label="Segment weight"
            />
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
                placeholder="Promo code"
                value={segment.prize.code}
                onChange={(e) => updateSegmentPrize(i, { code: e.target.value })}
                aria-label="Promo code"
              />
            )}
            <button
              type="button"
              className="config-panel__remove"
              onClick={() => removeSegment(i)}
              disabled={config.wheel.segments.length <= MIN_SEGMENTS}
              aria-label="Remove segment"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn config-panel__add" onClick={addSegment} disabled={config.wheel.segments.length >= MAX_SEGMENTS}>
          + Add segment
        </button>
      </section>
    </fieldset>
  );
}
