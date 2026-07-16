import { z } from 'zod';
import { CampaignConfigSchema } from '../schema';

const raw: z.input<typeof CampaignConfigSchema> = {
  campaignId: 'fmcg-demo',
  branding: {
    centerLabel: 'WIN',
    primaryColor: '#ff6a3d',
    secondaryColor: '#141419',
  },
  prizes: {
    segments: [
      { id: 's1', label: '10% OFF', color: '#ff6a3d', weight: 30, prize: { code: 'SAVE10', description: '10% off your next order', isWin: true } },
      { id: 's2', label: 'Try again', color: '#20202a', weight: 20, prize: { code: '', description: 'No luck this time', isWin: false } },
      { id: 's3', label: 'Free Shipping', color: '#ff9a3d', weight: 20, prize: { code: 'FREESHIP', description: 'Free shipping on your next order', isWin: true } },
      { id: 's4', label: '20% OFF', color: '#2a2a36', weight: 10, prize: { code: 'SAVE20', description: '20% off your next order', isWin: true } },
      { id: 's5', label: 'Try again', color: '#20202a', weight: 15, prize: { code: '', description: 'No luck this time', isWin: false } },
      { id: 's6', label: 'BIG PRIZE', color: '#ffb020', weight: 5, prize: { code: 'BIGWIN50', description: '50% off — you hit the jackpot', isWin: true } },
    ],
  },
  copy: {
    title: 'Scratch to win',
    subtitle: 'Drag to reveal your prize — good for your next order.',
    resultWinTitle: 'You won!',
    resultLoseTitle: 'So close — try again next time',
    leadFormTitle: 'Where should we send your prize?',
    leadFormSubmitLabel: 'Get my prize',
  },
  leadForm: {
    consentText: 'I agree to be contacted with my prize and occasional marketing emails. I can unsubscribe anytime.',
  },
};

export const fmcgDemoConfig = CampaignConfigSchema.parse(raw);
