/**
 * Tailor endpoint schemas and types
 * POST /api/tailor     — Full tailoring pipeline
 * POST /api/tailor/preview — Lightweight preview (no compression/formatting)
 */
import { z } from 'zod';
import { GapReportSchema } from './gapAnalysis.js';
import { CompressionStatsSchema } from './compressedContext.js';
import { QualityScoreSchema } from './qualityScore.js';

// ── Request schemas ──────────────────────────────────────────────────────────

export const TailorRequestSchema = z.object({
  taskInput: z.string().min(1).max(5000),
  projectId: z.string().min(1),
  targetPlatform: z.enum(['chatgpt', 'claude']),
  options: z
    .object({
      maxTokens: z.number().int().positive().optional(),
      includeWebSearch: z.boolean().default(true),
      includeScore: z.boolean().default(true),
      customInstructions: z.string().optional(),
    })
    .optional(),
});
export type TailorRequest = z.infer<typeof TailorRequestSchema>;

export const TailorPreviewRequestSchema = z.object({
  taskInput: z.string().min(1).max(5000),
  projectId: z.string().min(1),
  targetPlatform: z.enum(['chatgpt', 'claude']),
});
export type TailorPreviewRequest = z.infer<typeof TailorPreviewRequestSchema>;

// ── Response schemas ─────────────────────────────────────────────────────────

export const TailorSectionSchema = z.object({
  name: z.string(),
  content: z.string(),
  tokenCount: z.number().int().nonnegative(),
  sourceCount: z.number().int().nonnegative(),
});
export type TailorSection = z.infer<typeof TailorSectionSchema>;

export const TailorMetadataSchema = z.object({
  totalTokens: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative(),
  chunksRetrieved: z.number().int().nonnegative(),
  chunksIncluded: z.number().int().nonnegative(),
  gapReport: GapReportSchema,
  compressionStats: CompressionStatsSchema,
  processingTimeMs: z.number().int().nonnegative(),
  qualityScore: z.number().min(0).max(1),
  qualityDetails: QualityScoreSchema.optional(),
});
export type TailorMetadata = z.infer<typeof TailorMetadataSchema>;

export const TailorResponseSchema = z.object({
  sessionId: z.string(),
  context: z.string(),
  sections: z.array(TailorSectionSchema),
  metadata: TailorMetadataSchema,
});
export type TailorResponse = z.infer<typeof TailorResponseSchema>;

export const TailorPreviewResponseSchema = z.object({
  estimatedTokens: z.number().int().nonnegative(),
  estimatedChunks: z.number().int().nonnegative(),
  gapSummary: z.string(),
  estimatedQuality: z.number().min(0).max(1),
  processingTimeMs: z.number().int().nonnegative(),
});
export type TailorPreviewResponse = z.infer<typeof TailorPreviewResponseSchema>;
