import { z } from 'zod';
import { CampaignConfigSchema } from '../schema';

const raw: z.input<typeof CampaignConfigSchema> = {
  campaignId: 'fmcg-demo',
  branding: {
    centerLabel: 'GO',
    primaryColor: '#ff7a1a',
    secondaryColor: '#141419',
    logoUrl: `${import.meta.env.BASE_URL}assets/fmcg/logo.svg`,
    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
    backgroundHint: '#1a1008',
  },
  wheel: {
    spinDurationMs: 4200,
    minFullSpins: 5,
    segments: [
      { id: 's1', label: '10% OFF', color: '#ff7a1a', weight: 30, prize: { code: 'SAVE10', description: '10% off your next order', isWin: true } },
      { id: 's2', label: 'Try again', color: '#20202a', weight: 20, prize: { code: '', description: 'No luck this time', isWin: false } },
      { id: 's3', label: 'Free Shipping', color: '#ff9a3d', weight: 20, prize: { code: 'FREESHIP', description: 'Free shipping on your next order', isWin: true } },
      { id: 's4', label: '20% OFF', color: '#2a2a36', weight: 10, prize: { code: 'SAVE20', description: '20% off your next order', isWin: true } },
      { id: 's5', label: 'Try again', color: '#20202a', weight: 15, prize: { code: '', description: 'No luck this time', isWin: false } },
      { id: 's6', label: 'BIG PRIZE', color: '#ffb020', weight: 5, prize: { code: 'BIGWIN50', description: '50% off — you hit the jackpot', isWin: true } },
    ],
  },
  copy: {
    title: 'Spin to win',
    subtitle: 'One spin, one prize — good for your next order.',
    spinButtonLabel: 'Spin the wheel',
    resultWinTitle: 'You won!',
    resultLoseTitle: 'So close — try again next time',
    leadFormTitle: 'Where should we send your prize?',
    leadFormSubmitLabel: 'Get my prize',
    successTitle: 'Prize locked in',
    successBody: 'Code {code} logged for {email} — ready for CRM webhook.',
    claimButtonLabel: 'Claim it',
    continueButtonLabel: 'Try another day',
  },
  leadForm: {
    consentText: 'I agree to be contacted with my prize and occasional marketing emails. I can unsubscribe anytime.',
    webhookUrl: 'https://hooks.example.com/leads/fmcg-demo',
  },
  sound: { enabled: true },
};

export const fmcgDemoConfig = CampaignConfigSchema.parse(raw);
