import { z } from 'zod';

// A symbol that can form the winning triple. `weight` only governs how
// likely THIS symbol is to be the winner when the round is a win at all —
// see grid.loseWeight for the overall win/lose split.
export const LottoSymbolSchema = z.object({
  id: z.string(),
  icon: z.string(), // short glyph/emoji drawn on the tile once revealed
  weight: z.number().min(0).max(100),
  prize: z.object({
    code: z.string(),
    description: z.string(),
  }),
});

export const LottoConfigSchema = z.object({
  campaignId: z.string(),
  branding: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
  }),
  grid: z.object({
    rows: z.number().min(2).max(5).default(3),
    cols: z.number().min(2).max(5).default(3),
    // Relative weight of "no triple this round" vs. the sum of symbol weights.
    loseWeight: z.number().min(0).default(150),
  }),
  // Needs enough headroom to fill the grid without forcing an accidental
  // extra triple: roughly `2 * (symbols.length - 1) >= rows*cols - 3`.
  // 5 symbols comfortably covers a 3x3 (9-cell) grid.
  symbols: z.array(LottoSymbolSchema).min(4).max(8),
  copy: z.object({
    title: z.string(),
    subtitle: z.string(),
    resultWinTitle: z.string(),
    resultLoseTitle: z.string(),
    resultLoseDescription: z.string(),
    leadFormTitle: z.string(),
    leadFormSubmitLabel: z.string().default('Get my prize'),
  }),
  leadForm: z.object({
    consentText: z.string(),
  }),
});

export type LottoConfig = z.infer<typeof LottoConfigSchema>;
export type LottoSymbol = z.infer<typeof LottoSymbolSchema>;
