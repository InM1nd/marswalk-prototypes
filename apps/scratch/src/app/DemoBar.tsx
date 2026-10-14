import type { ReactNode } from 'react';

interface DemoBarProps {
  mode: 'card' | 'lotto';
  presets: Array<{ id: string; label: string; title?: string }>;
  activePresetId: string;
  onSelectPreset: (id: string) => void;
  presetsLocked: boolean;
  /** Show the anti-replay reset chip. */
  blocked: boolean;
  onResetSession: () => void;
  sound?: { muted: boolean; onToggle: () => void };
  /** Extra chips (e.g. Customize) rendered before the Styles link. */
  children?: ReactNode;
}

/** Presenter-only controls, visually separate from the consumer widget. */
export function DemoBar({
  mode,
  presets,
  activePresetId,
  onSelectPreset,
  presetsLocked,
  blocked,
  onResetSession,
  sound,
  children,
}: DemoBarProps) {
  const base = import.meta.env.BASE_URL;
  // Preset ids are "<vertical>-demo" / "<vertical>-lotto-demo": keep the vertical when switching mechanic.
  const vertical = activePresetId.split('-')[0];
  return (
    <nav className="demo-bar" aria-label="Demo controls">
      <a className="demo-bar__hub" href="/">← Hub</a>
      <span className="demo-bar__tag">Demo</span>
      <div className="preset-switcher" role="group" aria-label="Mechanic">
        <a className={`preset-switcher__btn${mode === 'card' ? ' is-active' : ''}`} href={`${base}?campaign=${vertical}-demo`}>
          Card
        </a>
        <a className={`preset-switcher__btn${mode === 'lotto' ? ' is-active' : ''}`} href={`${base}lotto?campaign=${vertical}-lotto-demo`}>
          Match-3
        </a>
      </div>
      <div className="preset-switcher" role="group" aria-label="Campaign vertical">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-switcher__btn${activePresetId === preset.id ? ' is-active' : ''}`}
            disabled={presetsLocked}
            onClick={() => onSelectPreset(preset.id)}
            title={preset.title}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {blocked && (
        <button
          type="button"
          className="demo-bar__chip demo-bar__chip--warn"
          onClick={onResetSession}
          title="Demo limit: 1 play / 24h on this device (prototype anti-replay). Click to reset the demo session."
        >
          1 play used · Reset
        </button>
      )}
      {sound && (
        <button type="button" className="demo-bar__chip" onClick={sound.onToggle} aria-pressed={!sound.muted}>
          {sound.muted ? 'Sound off' : 'Sound on'}
        </button>
      )}
      {children}
      <a className="demo-bar__chip" href={`${base}styles.html`}>
        Styles
      </a>
    </nav>
  );
}
