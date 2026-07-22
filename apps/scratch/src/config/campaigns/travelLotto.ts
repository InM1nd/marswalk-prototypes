import { z } from 'zod';
import { LottoConfigSchema } from '../lottoSchema';

const raw: z.input<typeof LottoConfigSchema> = {
  campaignId: 'travel-lotto-demo',
  branding: {
    centerLabel: 'TRIP',
    primaryColor: '#00b894',
    secondaryColor: '#0a1a18',
    backgroundHint: '#071412',
  },
  grid: { rows: 3, cols: 3, loseWeight: 150 },
  symbols: [
    { id: 'plane', icon: '✈️', weight: 30, prize: { code: 'TRIP15', description: '15% off your next booking' } },
    { id: 'bag', icon: '🧳', weight: 25, prize: { code: 'SEATUP', description: 'Free seat upgrade' } },
    { id: 'palm', icon: '🏝️', weight: 20, prize: { code: 'CREDIT50', description: '€50 travel credit' } },
    { id: 'ticket', icon: '🎫', weight: 15, prize: { code: 'BAGFREE', description: 'Free checked bag' } },
    { id: 'globe', icon: '🌍', weight: 10, prize: { code: 'WEEKEND', description: 'Weekend getaway voucher' } },
  ],
  copy: {
    title: 'Scratch your trip',
    subtitle: 'Match 3 symbols — land a booking perk.',
    resultWinTitle: 'Packed and ready!',
    resultLoseTitle: 'No match this time',
    resultLoseDescription: 'No triple this round — check back for the next drop.',
    leadFormTitle: 'Where should we send your travel code?',
    leadFormSubmitLabel: 'Get my deal',
    successTitle: 'Deal logged',
    successBody: 'Code {code} logged for {email} — ready for CRM webhook.',
    claimButtonLabel: 'Claim deal',
    continueButtonLabel: 'Maybe later',
  },
  leadForm: {
    consentText: 'I agree to be contacted with my prize and occasional travel offers.',
    webhookUrl: 'https://hooks.example.com/leads/travel-lotto',
  },
  sound: { enabled: true },
};

export const travelLottoConfig = LottoConfigSchema.parse(raw);
