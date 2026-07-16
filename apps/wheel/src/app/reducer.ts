import type { WheelSegment } from '../config/schema';

export type AppState =
  | { status: 'idle' }
  | { status: 'spinning' }
  | { status: 'result'; segment: WheelSegment }
  | { status: 'lead_form'; segment: WheelSegment }
  | { status: 'submitting'; segment: WheelSegment }
  | { status: 'submitted'; segment: WheelSegment }
  | { status: 'error'; segment: WheelSegment; message: string };

export type AppAction =
  | { type: 'SPIN_START' }
  | { type: 'SPIN_END'; segment: WheelSegment }
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
