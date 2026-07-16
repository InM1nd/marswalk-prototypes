import { z } from 'zod';
import { LottoConfigSchema } from '../lottoSchema';

const raw: z.input<typeof LottoConfigSchema> = {
  campaignId: 'fmcg-lotto-demo',
  branding: {
    primaryColor: '#ff6a3d',
    secondaryColor: '#141419',
  },
  grid: {
    rows: 3,
    cols: 3,
    loseWeight: 150,
  },
  symbols: [
    { id: 'clover', icon: '🍀', weight: 30, prize: { code: 'SAVE10', description: '10% off your next order' } },
    { id: 'gift', icon: '🎁', weight: 25, prize: { code: 'FREESHIP', description: 'Free shipping on your next order' } },
    { id: 'coin', icon: '💰', weight: 20, prize: { code: 'SAVE20', description: '20% off your next order' } },
    { id: 'star', icon: '⭐', weight: 15, prize: { code: 'SAVE30', description: '30% off your next order' } },
    { id: 'diamond', icon: '💎', weight: 10, prize: { code: 'BIGWIN50', description: '50% off — you hit the jackpot' } },
  ],
  copy: {
    title: 'Match 3 to win',
    subtitle: 'Scratch the tiles — find 3 matching symbols to win a prize.',
    resultWinTitle: 'You won!',
    resultLoseTitle: 'No match this time',
    resultLoseDescription: 'No three symbols matched — better luck on the next card.',
    leadFormTitle: 'Where should we send your prize?',
    leadFormSubmitLabel: 'Get my prize',
  },
  leadForm: {
    consentText: 'I agree to be contacted with my prize and occasional marketing emails. I can unsubscribe anytime.',
  },
};

export const fmcgLottoConfig = LottoConfigSchema.parse(raw);
