import { z } from 'zod';
import { KnowledgeDomainSchema } from './taskAnalysis.js';

export const GapTypeSchema = z.enum([
  'MISSING_DOMAIN',
  'SHALLOW_COVERAGE',
  'OUTDATED_INFO',
  'MISSING_EXAMPLES',
  'NO_CONTEXT',
]);
export type GapType = z.infer<typeof GapTypeSchema>;

export const GapSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type GapSeverity = z.infer<typeof GapSeveritySchema>;

export const GapSchema = z.object({
  type: GapTypeSchema,
  severity: GapSeveritySchema,
  description: z.string(),
  affectedDomains: z.array(KnowledgeDomainSchema),
  suggestedActions: z.array(z.enum(['web_search', 'upload_document', 'ask_user'])),
  suggestedQueries: z.array(z.string()),
});
export type Gap = z.infer<typeof GapSchema>;

export const GapReportSchema = z.object({
  gaps: z.array(GapSchema),
  overallCoverage: z.number().min(0).max(1),
  isActionable: z.boolean(),
  estimatedQualityWithoutFilling: z.number().min(0).max(1),
  estimatedQualityWithFilling: z.number().min(0).max(1),
});
export type GapReport = z.infer<typeof GapReportSchema>;
