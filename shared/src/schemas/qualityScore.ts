/**
 * Quality scoring schemas for tailored context evaluation.
 * Sub-scores measure different dimensions of context quality.
 */
import { z } from 'zod';

export const QualitySubScoresSchema = z.object({
  coverage: z.number().min(0).max(1).describe('How much of the task is addressed by context'),
  diversity: z.number().min(0).max(1).describe('Variety of source documents and types'),
  relevance: z.number().min(0).max(1).describe('Average relevance of selected chunks'),
  compression: z.number().min(0).max(1).describe('Efficiency of compression from raw sources'),
});
export type QualitySubScores = z.infer<typeof QualitySubScoresSchema>;

export const QualityScoreSchema = z.object({
  overall: z.number().min(0).max(100).describe('Weighted composite score (0-100)'),
  subScores: QualitySubScoresSchema,
  suggestions: z.array(z.string()).describe('Actionable improvement hints'),
  scoredAt: z.string().datetime().describe('ISO timestamp when scored'),
});
export type QualityScore = z.infer<typeof QualityScoreSchema>;

/** Weights for computing the composite score */
export const QUALITY_WEIGHTS = {
  coverage: 0.35,
  relevance: 0.30,
  diversity: 0.20,
  compression: 0.15,
} as const;
