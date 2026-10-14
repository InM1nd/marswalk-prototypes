import { z } from 'zod';
import { CampaignConfigSchema } from '../schema';

const raw: z.input<typeof CampaignConfigSchema> = {
  campaignId: 'bank-demo',
  branding: {
    centerLabel: 'BANK',
    primaryColor: '#1a6bff',
    secondaryColor: '#0c1220',
    logoUrl: `${import.meta.env.BASE_URL}assets/bank/logo.svg`,
    fontFamily: 'Manrope, system-ui, sans-serif',
    backgroundHint: '#080e1a',
  },
  prizes: {
    segments: [
      { id: 'b1', label: '€10 Cashback', color: '#1a6bff', weight: 28, prize: { code: 'CASH10', description: '€10 cashback on your first card spend', isWin: true } },
      { id: 'b2', label: 'Try again', color: '#1a2233', weight: 18, prize: { code: '', description: 'No luck this time', isWin: false } },
      { id: 'b3', label: '0% Fee', color: '#3d8bff', weight: 22, prize: { code: 'FEE0', description: 'Zero foreign-transaction fees for 3 months', isWin: true } },
      { id: 'b4', label: '€25 Bonus', color: '#152038', weight: 12, prize: { code: 'BONUS25', description: '€25 account bonus after first deposit', isWin: true } },
      { id: 'b5', label: 'Try again', color: '#1a2233', weight: 15, prize: { code: '', description: 'No luck this time', isWin: false } },
      { id: 'b6', label: 'Premium year', color: '#7eb0ff', weight: 5, prize: { code: 'PREM12', description: '12 months of premium banking — free', isWin: true } },
    ],
  },
  copy: {
    title: 'Scratch for cashback',
    subtitle: 'Reveal a card reward — one play per visitor.',
    resultWinTitle: 'Reward unlocked!',
    resultLoseTitle: 'Almost — come back for the next promo',
    leadFormTitle: 'Where should we send your reward code?',
    leadFormSubmitLabel: 'Claim my reward',
    successTitle: 'Reward queued',
    successBody: 'Code {code} logged for {email} — ready for CRM webhook.',
    claimButtonLabel: 'Claim reward',
    continueButtonLabel: 'Back to start',
    scratchHint: 'SCRATCH FOR REWARD',
  },
  leadForm: {
    consentText: 'I agree to be contacted about my reward and occasional product updates. I can unsubscribe anytime.',
    webhookUrl: 'https://hooks.example.com/leads/bank-scratch',
  },
  sound: { enabled: true },
};

export const bankDemoConfig = CampaignConfigSchema.parse(raw);
