import type { PlinkoConfig } from '../schema';

export const fmcgDemoConfig: PlinkoConfig = {
  campaignId: 'fmcg-plinko-demo',
  branding: {
    primaryColor: '#ff5a36',
    secondaryColor: '#ffc857',
    bgColor: '#0a0e14',
    accentColor: '#f7f5ed',
  },
  board: {
    rows: 6,
    slots: 7,
  },
  slots: [
    { id: 's0', label: '5%', prize: '5% OFF', weight: 2, highlight: false },
    { id: 's1', label: 'TRY', prize: 'Free Sample', weight: 3, highlight: false },
    { id: 's2', label: '10%', prize: '10% OFF', weight: 2, highlight: true },
    { id: 's3', label: 'VIP', prize: 'VIP Bundle', weight: 1, highlight: true },
    { id: 's4', label: '10%', prize: '10% OFF', weight: 2, highlight: true },
    { id: 's5', label: 'TRY', prize: 'Free Sample', weight: 3, highlight: false },
    { id: 's6', label: '5%', prize: '5% OFF', weight: 2, highlight: false },
  ],
  copy: {
    title: 'PLINKO DROP',
    subtitle: 'Drop the puck. Land a prize. Instant brand theater for booths and paid social.',
    dropButtonLabel: 'DROP THE PUCK',
    resultTitle: 'YOU LANDED',
    retryButtonLabel: 'DROP AGAIN',
    leadFormTitle: 'Where should we send your prize?',
    leadFormSubmitLabel: 'Get my prize',
  },
  leadForm: {
    consentText: 'I agree to be contacted with my prize and occasional marketing emails. I can unsubscribe anytime.',
  },
};
