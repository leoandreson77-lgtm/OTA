import { z } from 'zod';

export const FareRuleAnalysisSchema = z.object({
  fareBasisCode: z.string(),
  airlineCode: z.string().length(2),
  isRefundable: z.boolean(),
  refundPenalty: z.number().default(0),
  isChangeable: z.boolean(),
  changePenalty: z.number().default(0),
  voidWindowHours: z.number().default(24), // Void window before full cancel fee applies
  noShowPenalty: z.number().default(0),
  waiverApplicable: z.boolean().default(false),
  plainLanguageExplanation: z.string(),
  admRiskFactors: z.array(z.string()).default([])
});
export type FareRuleAnalysis = z.infer<typeof FareRuleAnalysisSchema>;

