import type { CatchConfig } from '../schema';

export const lunchDemoConfig: CatchConfig = {
  campaignId: 'lunch-demo',
  branding: {
    primaryColor: '#ff6b2c',
    secondaryColor: '#ffd166',
    bgColor: '#07060f',
    fontFamily: 'Bricolage Grotesque',
    brandName: 'BITE',
  },
  round: {
    durationSeconds: 20,
  },
  drop: {
    fallSpeed: 200,
    fallSpeedEnd: 330,
    spawnEveryMs: 520,
    spawnEveryEndMs: 320,
    badChance: 0.16,
    badChanceEnd: 0.3,
    goldenChance: 0.07,
  },
  prize: {
    threshold: 400,
    label: '−30%',
    title: '30% off your next order',
    description: 'Your code works on any BITE order over €15 for the next 7 days.',
    code: 'BITE30',
  },
  copy: {
    eyebrow: 'BITE · Lunch Rush',
    title: 'Catch the lunch rush',
    subtitle: 'Catch the food, dodge the late clocks and score 400 in 20 seconds to unlock 30% off.',
    startButtonLabel: 'Start catching',
    winTitle: 'Prize unlocked!',
    loseTitle: 'So close!',
    retryButtonLabel: 'Play again',
    claimButtonLabel: 'Claim my −30%',
    leadFormTitle: 'Where should we send your code?',
    leadFormSubmitLabel: 'Send my code',
    consentText: 'I agree to receive my prize and occasional offers from BITE by email.',
    doneText: 'Bon appétit!',
  },
  leadForm: { webhookUrl: 'https://hooks.example.com/bite/leads' },
};
