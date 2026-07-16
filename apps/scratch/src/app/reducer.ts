// Minimal structural shapes GameShell/ResultModal/LeadForm actually touch —
// deliberately NOT the concrete classic-scratch CampaignConfig/PrizeSlot
// types, so a second mechanic (the lotto grid) with its own config schema
// and its own resolved-prize shape can flow through the same shell.
export interface ResolvedPrize {
  prize: {
    code: string;
    description: string;
    isWin: boolean;
  };
}

export interface GameConfig {
  campaignId: string;
  branding: { primaryColor: string };
  copy: {
    title: string;
    subtitle: string;
    resultWinTitle: string;
    resultLoseTitle: string;
    leadFormTitle: string;
    leadFormSubmitLabel: string;
  };
  leadForm: { consentText: string };
}

export type AppState =
  | { status: 'idle' }
  | { status: 'spinning' }
  | { status: 'result'; segment: ResolvedPrize }
  | { status: 'lead_form'; segment: ResolvedPrize }
  | { status: 'submitting'; segment: ResolvedPrize }
  | { status: 'submitted'; segment: ResolvedPrize }
  | { status: 'error'; segment: ResolvedPrize; message: string };

export type AppAction =
  | { type: 'SPIN_START' }
  | { type: 'SPIN_END'; segment: ResolvedPrize }
  | { type: 'CLAIM' }
  | { type: 'RESET' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; message: string };

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SPIN_START':
      return { status: 'spinning' };
    case 'SPIN_END':
      return { status: 'result', segment: action.segment };
    case 'CLAIM':
      if (state.status !== 'result') return state;
      return { status: 'lead_form', segment: state.segment };
    case 'RESET':
      return { status: 'idle' };
    case 'SUBMIT_START':
      if (state.status !== 'lead_form' && state.status !== 'error') return state;
      return { status: 'submitting', segment: state.segment };
    case 'SUBMIT_SUCCESS':
      if (state.status !== 'submitting') return state;
      return { status: 'submitted', segment: state.segment };
    case 'SUBMIT_ERROR':
      if (state.status !== 'submitting') return state;
      return { status: 'error', segment: state.segment, message: action.message };
    default:
      return state;
  }
}
