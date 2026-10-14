import type { RunnerConfig } from '../schema';

export const mobilityDemoConfig: RunnerConfig = {
  campaignId: 'mobility-demo',
  branding: {
    primaryColor: '#ff5a36',
    secondaryColor: '#ffc857',
    bgColor: '#05060d',
    fontFamily: 'Bricolage Grotesque',
    brandName: 'GO',
  },
  physics: {
    gravity: 1.2,
    jumpForce: -7.4,
    baseSpeed: 3.2,
    speedRampPerSecond: 0.045,
  },
  round: {
    durationSeconds: 45,
  },
  billboard: { headline: 'GO', offer: '−20%', footnote: 'FIRST RIDE' },
  prize: {
    threshold: 150,
    label: '−20%',
    title: '20% off your first ride',
    description: 'Your code works on any GO scooter in the city for 7 days.',
    code: 'GORIDE20',
  },
  copy: {
    eyebrow: 'GO · City Rush',
    title: 'Beat the rush hour',
    subtitle: 'Hop the cones, grab ride credits and score 150 to unlock 20% off your first ride.',
    startButtonLabel: 'Start ride',
    winTitle: 'Prize unlocked!',
    loseTitle: 'So close!',
    retryButtonLabel: 'Ride again',
    claimButtonLabel: 'Claim my −20%',
    leadFormTitle: 'Where should we send your code?',
    leadFormSubmitLabel: 'Send my code',
    consentText: 'I agree to receive my prize and occasional offers from GO by email.',
  },
  leadForm: { webhookUrl: 'https://hooks.example.com/go/leads' },
};
