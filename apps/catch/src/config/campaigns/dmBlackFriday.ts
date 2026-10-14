import type { CatchConfig } from '../schema';

export const dmBlackFridayConfig: CatchConfig = {
  campaignId: 'dm-black-friday',
  branding: {
    primaryColor: '#E4003A',
    secondaryColor: '#FFD100',
    bgColor: '#0A1931',
    fontFamily: 'Bricolage Grotesque',
    brandName: 'dm',
  },
  round: { durationSeconds: 30 },
  drop: {
    fallSpeed: 180,
    fallSpeedEnd: 290,
    spawnEveryMs: 700,
    spawnEveryEndMs: 450,
    badChance: 0.15,
    badChanceEnd: 0.23,
    goldenChance: 0.08,
  },
  prize: {
    threshold: 250,
    minimumScore: 150,
    label: '-15%',
    title: '-15% auf deinen gesamten Einkauf + 100 Extra PAYBACK Punkte',
    description: 'Dein Glückskorb hat sich gelohnt: Sichere dir deinen Black Friday Bonus.',
    code: 'DM-BLACK-15',
  },
  copy: {
    eyebrow: 'dm · Black Friday Special',
    title: 'Bereit für den DM Black Friday?',
    subtitle: 'Fang deine Lieblingsprodukte. Füll deinen Glückskorb. Hol dir deinen Bonus.',
    startButtonLabel: 'JETZT FANGEN & SPAREN',
    winTitle: 'Stark gefangen! Dein DM Black Friday Bonus ist bereit.',
    loseTitle: 'Noch ein Korb voller Glück?',
    retryButtonLabel: 'NOCHMAL FANGEN',
    claimButtonLabel: 'BONUS SICHERN',
    leadFormTitle: 'Dein Bonus wartet auf dich.',
    leadFormSubmitLabel: 'BONUS FREISCHALTEN',
    consentText:
      'Ich stimme der Verarbeitung meiner E-Mail-Adresse zur Bereitstellung meines Bonus zu.',
    doneText: 'Viel Freude mit deinem Glücksfang!',
  },
  leadForm: {},
};
