import { z } from 'zod';
import { LottoConfigSchema } from '../lottoSchema';

const raw: z.input<typeof LottoConfigSchema> = {
  campaignId: 'bank-lotto-demo',
  branding: {
    centerLabel: 'BANK',
    primaryColor: '#1a6bff',
    secondaryColor: '#0c1220',
    backgroundHint: '#080e1a',
  },
  grid: { rows: 3, cols: 3, loseWeight: 150 },
  symbols: [
    { id: 'card', icon: '💳', weight: 30, prize: { code: 'CASH10', description: '€10 cashback on first spend' } },
    { id: 'vault', icon: '🏦', weight: 25, prize: { code: 'FEE0', description: 'Zero FX fees for 3 months' } },
    { id: 'coin', icon: '🪙', weight: 20, prize: { code: 'BONUS25', description: '€25 account bonus' } },
    { id: 'key', icon: '🔑', weight: 15, prize: { code: 'SAFE5', description: '5% savings boost' } },
    { id: 'crown', icon: '👑', weight: 10, prize: { code: 'PREM12', description: '12 months premium free' } },
  ],
  copy: {
    title: 'Scratch & match cashback',
    subtitle: 'Find 3 matching symbols — unlock a banking reward.',
    resultWinTitle: 'Reward unlocked!',
    resultLoseTitle: 'No match this time',
    resultLoseDescription: 'No triple this round — try the next promo.',
    leadFormTitle: 'Where should we send your reward?',
    leadFormSubmitLabel: 'Claim my reward',
    successTitle: 'Reward queued',
    successBody: 'Code {code} logged for {email} — ready for CRM webhook.',
    claimButtonLabel: 'Claim reward',
    continueButtonLabel: 'Back',
  },
  leadForm: {
    consentText: 'I agree to be contacted about my reward and occasional product updates.',
    webhookUrl: 'https://hooks.example.com/leads/bank-lotto',
  },
  sound: { enabled: true },
};

export const bankLottoConfig = LottoConfigSchema.parse(raw);
