import { z } from 'zod';

// Trimmed to what the core spin -> result -> lead loop needs.
// Sound, multi-field lead form, and logo image are deferred (see prototype-1-wheel.md §6).
export const WheelSegmentSchema = z.object({
  id: z.string(),
  label: z.string().max(20),
  color: z.string(),
  textColor: z.string().default('#FFFFFF'),
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
  }),
  leadForm: z.object({
    consentText: z.string(),
  }),
});

export type CampaignConfig = z.infer<typeof CampaignConfigSchema>;
export type WheelSegment = z.infer<typeof WheelSegmentSchema>;
