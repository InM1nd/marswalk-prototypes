import { z } from 'zod';
import { LottoConfigSchema } from '../lottoSchema';

const raw: z.input<typeof LottoConfigSchema> = {
  campaignId: 'fmcg-lotto-demo',
  branding: {
    centerLabel: 'GO',
    primaryColor: '#ff6a3d',
    secondaryColor: '#141419',
    logoUrl: `${import.meta.env.BASE_URL}assets/fmcg/logo.svg`,
    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
    backgroundHint: '#1a0e0a',
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
    successTitle: 'Prize locked in',
    successBody: 'Code {code} logged for {email} — ready for CRM webhook.',
    claimButtonLabel: 'Claim it',
    continueButtonLabel: 'Try another day',
  },
  leadForm: {
    consentText: 'I agree to be contacted with my prize and occasional marketing emails. I can unsubscribe anytime.',
    webhookUrl: 'https://hooks.example.com/leads/fmcg-lotto',
  },
  sound: { enabled: true },
};

export const fmcgLottoConfig = LottoConfigSchema.parse(raw);
