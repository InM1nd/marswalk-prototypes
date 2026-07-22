import { z } from 'zod';

export const LottoSymbolSchema = z.object({
  id: z.string(),
  icon: z.string(),
  weight: z.number().min(0).max(100),
  prize: z.object({
    code: z.string(),
    description: z.string(),
  }),
});

export const LottoConfigSchema = z.object({
  campaignId: z.string(),
  branding: z.object({
    centerLabel: z.string().default('LOTTO'),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    logoUrl: z.string().optional(),
    fontFamily: z.string().default('system-ui, sans-serif'),
    backgroundHint: z.string().optional(),
  }),
  grid: z.object({
    rows: z.number().min(2).max(5).default(3),
    cols: z.number().min(2).max(5).default(3),
    loseWeight: z.number().min(0).default(150),
  }),
  symbols: z.array(LottoSymbolSchema).min(4).max(8),
  copy: z.object({
    title: z.string(),
    subtitle: z.string(),
    resultWinTitle: z.string(),
    resultLoseTitle: z.string(),
    resultLoseDescription: z.string(),
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
    })
    .default({ enabled: true }),
});

export type LottoConfig = z.infer<typeof LottoConfigSchema>;
export type LottoSymbol = z.infer<typeof LottoSymbolSchema>;
