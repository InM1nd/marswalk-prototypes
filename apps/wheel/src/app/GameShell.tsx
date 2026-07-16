import { useReducer, type Dispatch, type ReactNode } from 'react';
import type { CampaignConfig } from '../config/schema';
import { reducer, type AppAction, type AppState } from './reducer';
import { ResultModal } from './ResultModal';
import { LeadForm, type LeadFormValues } from './LeadForm';

interface GameShellProps {
  config: CampaignConfig;
  /** Called alongside RESET, so a page can reroll any of its own extra state (e.g. the scratch card's prize). */
  onReset?: () => void;
  children: (args: { state: AppState; dispatch: Dispatch<AppAction> }) => ReactNode;
}

// The header, the result/lead capture/submitted modals, and the
// idle->spinning->result->lead_form->submitted state machine. WheelPage only
// supplies what happens in `app__stage` — the actual interactive render
// engine — everything downstream of "a prize got resolved" is generic
// (the scratch-card app, apps/scratch, has its own identical copy of this
// file — see prototype-1-wheel.md §3 for why the two apps are separate).
export function GameShell({ config, onReset, children }: GameShellProps) {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' });

  const resetRound = () => {
    onReset?.();
    dispatch({ type: 'RESET' });
  };

  const handleLeadSubmit = async (values: LeadFormValues) => {
    dispatch({ type: 'SUBMIT_START' });
    // Prototype-level mock: no real backend yet, see prototype-1-wheel.md §7.
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('[lead:submitted]', { campaignId: config.campaignId, ...values });
    dispatch({ type: 'SUBMIT_SUCCESS' });
  };

  return (
    <div className="app" style={{ ['--brand-primary' as string]: config.branding.primaryColor }}>
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
          <div className="modal">
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
          <div className="modal">
            <h2 className="modal__title">You're all set</h2>
            <p className="modal__description">
              We sent <strong>{state.segment.prize.code}</strong> to your inbox.
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
