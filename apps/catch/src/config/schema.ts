import { z } from 'zod';

// One catcher, three good drops, one golden drop, one bad drop. All art is generated
// from the brand colours (see engine/art.ts), so a new client needs zero art pipeline.
export const CatchConfigSchema = z.object({
  campaignId: z.string(),
  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    bgColor: z.string(),
    fontFamily: z.string().default('Bricolage Grotesque'),
    brandName: z.string(),
  }),
  round: z.object({
    durationSeconds: z.number().default(20),
  }),
  /** Difficulty ramps linearly from the first value to the `…End` value over the round. */
  drop: z.object({
    fallSpeed: z.number(),
    fallSpeedEnd: z.number(),
    spawnEveryMs: z.number(),
    spawnEveryEndMs: z.number(),
    badChance: z.number(),
    badChanceEnd: z.number(),
    goldenChance: z.number(),
  }),
  /** Reaching `threshold` points unlocks the prize; the round end then leads to the lead form. */
  prize: z.object({
    threshold: z.number(),
    label: z.string(),
    title: z.string(),
    description: z.string(),
    code: z.string(),
  }),
  copy: z.object({
    eyebrow: z.string(),
    title: z.string(),
    subtitle: z.string(),
    startButtonLabel: z.string().default('Play'),
    winTitle: z.string(),
    loseTitle: z.string(),
    retryButtonLabel: z.string().default('Play again'),
    claimButtonLabel: z.string().default('Claim it'),
    leadFormTitle: z.string(),
    leadFormSubmitLabel: z.string(),
    consentText: z.string(),
    doneText: z.string(),
  }),
  leadForm: z.object({ webhookUrl: z.string().optional() }),
});

export type CatchConfig = z.infer<typeof CatchConfigSchema>;
