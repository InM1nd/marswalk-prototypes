import { z } from 'zod';
import { CampaignConfigSchema } from '../schema';

const raw: z.input<typeof CampaignConfigSchema> = {
  campaignId: 'travel-demo',
  branding: {
    centerLabel: 'TRIP',
    primaryColor: '#00b894',
    secondaryColor: '#0a1a18',
    logoUrl: `${import.meta.env.BASE_URL}assets/travel/logo.svg`,
    fontFamily: 'Sora, system-ui, sans-serif',
    backgroundHint: '#071412',
  },
  wheel: {
    spinDurationMs: 4200,
    minFullSpins: 5,
    segments: [
      { id: 't1', label: '15% OFF', color: '#00b894', weight: 28, prize: { code: 'TRIP15', description: '15% off your next booking', isWin: true } },
      { id: 't2', label: 'Try again', color: '#14302c', weight: 18, prize: { code: '', description: 'No luck this time', isWin: false } },
      { id: 't3', label: 'Free seat', color: '#2dd4a8', weight: 20, prize: { code: 'SEATUP', description: 'Free seat upgrade on your next flight', isWin: true } },
      { id: 't4', label: '€50 credit', color: '#1a3d38', weight: 12, prize: { code: 'CREDIT50', description: '€50 travel credit toward any trip', isWin: true } },
      { id: 't5', label: 'Try again', color: '#14302c', weight: 15, prize: { code: '', description: 'No luck this time', isWin: false } },
      { id: 't6', label: 'Weekend away', color: '#7dffe0', weight: 7, prize: { code: 'WEEKEND', description: 'Win a weekend getaway voucher', isWin: true } },
    ],
  },
  copy: {
    title: 'Spin your next trip',
    subtitle: 'One spin — land a booking perk for your next escape.',
    spinButtonLabel: 'Spin for a deal',
    resultWinTitle: 'Packed and ready!',
    resultLoseTitle: 'Not this time — check back for the next drop',
    leadFormTitle: 'Where should we send your travel code?',
    leadFormSubmitLabel: 'Get my deal',
    successTitle: 'Deal logged',
    successBody: 'Code {code} logged for {email} — ready for CRM webhook.',
    claimButtonLabel: 'Claim deal',
    continueButtonLabel: 'Maybe later',
  },
  leadForm: {
    consentText: 'I agree to be contacted with my prize and occasional travel offers. I can unsubscribe anytime.',
    webhookUrl: 'https://hooks.example.com/leads/travel-demo',
  },
  sound: { enabled: true },
};

export const travelDemoConfig = CampaignConfigSchema.parse(raw);
