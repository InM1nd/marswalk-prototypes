import { useEffect, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import type { CampaignConfig } from '../config/schema';
import { reducer, type AppAction, type AppState } from './reducer';
import { ResultModal } from './ResultModal';
import { LeadForm, type LeadFormValues } from './LeadForm';
import { track } from '../lib/analytics';
import { onColor } from '../lib/color';

interface GameShellProps {
  config: CampaignConfig;
  /** Called alongside RESET, so a page can reroll any of its own extra state. */
  onReset?: () => void;
  children: (args: { state: AppState; dispatch: Dispatch<AppAction> }) => ReactNode;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

export function GameShell({ config, onReset, children }: GameShellProps) {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });
  const [leadEmail, setLeadEmail] = useState('');

  useEffect(() => {
    track('wheel_view', { campaignId: config.campaignId });
  }, [config.campaignId]);

  useEffect(() => {
    if (state.status === 'lead_form') {
      track('lead_form_open', { campaignId: config.campaignId });
    }
  }, [state.status, config.campaignId]);

  const resetRound = () => {
    onReset?.();
    setLeadEmail('');
    dispatch({ type: 'RESET' });
  };

  const handleLeadSubmit = async (values: LeadFormValues) => {
    dispatch({ type: 'SUBMIT_START' });
    setLeadEmail(values.email);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('[lead:submitted]', {
      campaignId: config.campaignId,
      webhookUrl: config.leadForm.webhookUrl,
      ...values,
    });
    track('lead_submitted', { campaignId: config.campaignId });
    dispatch({ type: 'SUBMIT_SUCCESS' });
  };

  const wash = config.branding.backgroundHint ?? config.branding.secondaryColor;

  return (
    <div
      className="app"
      style={{
        ['--brand-primary' as string]: config.branding.primaryColor,
        ['--brand-on-primary' as string]: onColor(config.branding.primaryColor),
        ['--brand-secondary' as string]: config.branding.secondaryColor,
        ['--brand-wash' as string]: wash,
        ['--brand-font' as string]: config.branding.fontFamily,
      }}
    >
      <header className="app__header">
        <h1 className="app__title">{config.copy.title}</h1>
        <p className="app__subtitle">{config.copy.subtitle}</p>
      </header>

      <main className="app__stage">{children({ state, dispatch })}</main>

      {state.status === 'result' && (
        <ResultModal
          config={config}
          segment={state.segment}
          onContinue={() => (state.segment.prize.isWin ? dispatch({ type: 'CLAIM' }) : resetRound())}
        />
      )}

      {(state.status === 'lead_form' || state.status === 'submitting' || state.status === 'error') && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <LeadForm
              config={config}
              segment={state.segment}
              submitting={state.status === 'submitting'}
              errorMessage={state.status === 'error' ? state.message : undefined}
              onSubmit={handleLeadSubmit}
            />
          </div>
        </div>
      )}

      {state.status === 'submitted' && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <svg className="modal__check" viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r="24" />
              <path d="M15 27l7 7 15-16" />
            </svg>
            <h2 className="modal__title">{config.copy.successTitle}</h2>
            <p className="modal__description">
              {fillTemplate(config.copy.successBody, {
                code: state.segment.prize.code,
                email: leadEmail,
              })}
            </p>
            <p className="modal__pipeline">
              Lead captured · {config.campaignId} · {new Date().toLocaleTimeString()}
            </p>
            <button type="button" className="btn btn--primary" onClick={resetRound}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
