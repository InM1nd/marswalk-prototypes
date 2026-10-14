import { z } from 'zod';

export const WheelSegmentSchema = z.object({
  id: z.string(),
  label: z.string().max(20),
  color: z.string(),
  // Omit to auto-pick dark/light text from the segment color.
  textColor: z.string().optional(),
  weight: z.number().min(0).max(100),
  prize: z.object({
    code: z.string(),
    description: z.string(),
    isWin: z.boolean().default(true),
  }),
});

export const CampaignConfigSchema = z.object({
  campaignId: z.string(),
  branding: z.object({
    centerLabel: z.string(),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    logoUrl: z.string().optional(),
    fontFamily: z.string().default('system-ui, sans-serif'),
    backgroundHint: z.string().optional(),
  }),
  wheel: z.object({
    segments: z.array(WheelSegmentSchema).min(4).max(12),
    spinDurationMs: z.number().default(4200),
    minFullSpins: z.number().default(4),
  }),
  copy: z.object({
    title: z.string(),
    subtitle: z.string(),
    spinButtonLabel: z.string().default('Spin'),
    resultWinTitle: z.string(),
    resultLoseTitle: z.string(),
    leadFormTitle: z.string(),
    leadFormSubmitLabel: z.string().default('Get my prize'),
    successTitle: z.string().default("You're all set"),
    successBody: z
      .string()
      .default('Prize {code} logged for {email} — ready for CRM webhook.'),
    claimButtonLabel: z.string().default('Claim it'),
    continueButtonLabel: z.string().default('Continue'),
  }),
  leadForm: z.object({
    consentText: z.string(),
    webhookUrl: z.string().url().optional(),
  }),
  sound: z
    .object({
      enabled: z.boolean().default(true),
      tickUrl: z.string().optional(),
      winUrl: z.string().optional(),
    })
    .default({ enabled: true }),
});

export type CampaignConfig = z.infer<typeof CampaignConfigSchema>;
export type WheelSegment = z.infer<typeof WheelSegmentSchema>;
