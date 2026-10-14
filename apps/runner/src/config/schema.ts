import { z } from 'zod';

// Runner mode, two obstacle types, one coin type. All art is generated from the
// brand colours (see engine/art.ts), so a new client needs zero art pipeline.
export const RunnerConfigSchema = z.object({
  campaignId: z.string(),
  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    bgColor: z.string(),
    fontFamily: z.string().default('Bricolage Grotesque'),
    brandName: z.string(),
  }),
  physics: z.object({
    gravity: z.number().default(1.2),
    jumpForce: z.number().default(-14),
    baseSpeed: z.number().default(6),
    speedRampPerSecond: z.number().default(0.05),
  }),
  round: z.object({
    durationSeconds: z.number().default(45),
  }),
  /** In-world billboard: the offer stays on screen for the whole run. */
  billboard: z.object({ headline: z.string(), offer: z.string(), footnote: z.string() }),
  /** Reaching `threshold` points unlocks the prize; game over then leads to the lead form. */
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
  }),
  leadForm: z.object({ webhookUrl: z.string().optional() }),
});

export type RunnerConfig = z.infer<typeof RunnerConfigSchema>;
