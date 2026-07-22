import { useEffect, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import { reducer, type AppAction, type AppState, type GameConfig } from './reducer';
import { ResultModal } from './ResultModal';
import { LeadForm, type LeadFormValues } from './LeadForm';
import { track } from '../lib/analytics';

interface GameShellProps {
  config: GameConfig;
  analyticsPrefix?: 'scratch' | 'lotto';
  onReset?: () => void;
  children: (args: { state: AppState; dispatch: Dispatch<AppAction> }) => ReactNode;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

export function GameShell({ config, analyticsPrefix = 'scratch', onReset, children }: GameShellProps) {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });
  const [leadEmail, setLeadEmail] = useState('');

  useEffect(() => {
    track(`${analyticsPrefix}_view`, { campaignId: config.campaignId });
  }, [config.campaignId, analyticsPrefix]);

  useEffect(() => {
    if (state.status === 'lead_form') {
      track('lead_form_open', { campaignId: config.campaignId, mechanic: analyticsPrefix });
    }
  }, [state.status, config.campaignId, analyticsPrefix]);

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
    track('lead_submitted', { campaignId: config.campaignId, mechanic: analyticsPrefix });
    dispatch({ type: 'SUBMIT_SUCCESS' });
  };

  const wash = config.branding.backgroundHint ?? config.branding.secondaryColor ?? '#0a0a0f';

  return (
    <div
      className="app"
      style={{
        ['--brand-primary' as string]: config.branding.primaryColor,
        ['--brand-secondary' as string]: config.branding.secondaryColor ?? '#141419',
        ['--brand-wash' as string]: wash,
        fontFamily: config.branding.fontFamily,
      }}
    >
      <a className="hub-link" href="/">← Hub</a>
      <header className="app__header">
        <h1 className="app__title">{config.copy.title}</h1>
        <p className="app__subtitle">{config.copy.subtitle}</p>
      </header>

      <main className="app__stage">{children({ state, dispatch })}</main>

      {state.status === 'result' && (
        <ResultModal
          config={config}
          segment={state.segment}
          analyticsPrefix={analyticsPrefix}
          onContinue={() => (state.segment.prize.isWin ? dispatch({ type: 'CLAIM' }) : resetRound())}
        />
      )}

      {(state.status === 'lead_form' || state.status === 'submitting' || state.status === 'error') && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <LeadForm
              config={config}
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
            <h2 className="modal__title">{config.copy.successTitle ?? "You're all set"}</h2>
            <p className="modal__description">
              {fillTemplate(config.copy.successBody ?? 'Prize {code} logged for {email} — ready for CRM webhook.', {
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
