import { z } from 'zod';

export const PlinkoSlotSchema = z.object({
  id: z.string(),
  label: z.string(),
  prize: z.string(),
  weight: z.number().positive().default(1),
  highlight: z.boolean().default(false),
});

export const PlinkoConfigSchema = z.object({
  campaignId: z.string(),
  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    bgColor: z.string(),
    accentColor: z.string(),
  }),
  board: z.object({
    rows: z.number().int().min(5).max(12).default(8),
    slots: z.number().int().min(5).max(9).default(7),
  }),
  slots: z.array(PlinkoSlotSchema).min(5).max(9),
  copy: z.object({
    title: z.string(),
    subtitle: z.string(),
    dropButtonLabel: z.string().default('DROP'),
    resultTitle: z.string(),
    retryButtonLabel: z.string().default('DROP AGAIN'),
  }),
});

export type PlinkoConfig = z.infer<typeof PlinkoConfigSchema>;
export type PlinkoSlot = z.infer<typeof PlinkoSlotSchema>;
