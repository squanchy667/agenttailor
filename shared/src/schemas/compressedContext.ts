import { z } from 'zod';

export const CompressionLevelSchema = z.enum(['FULL', 'SUMMARY', 'KEYWORDS']);
export type CompressionLevel = z.infer<typeof CompressionLevelSchema>;

export const CompressedChunkSchema = z.object({
  originalChunkId: z.string(),
  compressionLevel: CompressionLevelSchema,
  content: z.string(),
  originalTokenCount: z.number().int().nonnegative(),
  compressedTokenCount: z.number().int().nonnegative(),
  relevanceScore: z.number(),
});
export type CompressedChunk = z.infer<typeof CompressedChunkSchema>;

export const CompressionConfigSchema = z.object({
  totalTokenBudget: z.number().int().positive(),
  thresholds: z
    .object({
      fullMin: z.number().min(0).max(1).default(0.8),
      summaryMin: z.number().min(0).max(1).default(0.5),
      keywordsMin: z.number().min(0).max(1).default(0.3),
    })
    .default({}),
  summaryMaxTokens: z.number().int().positive().default(150),
  reservedTokens: z.number().int().nonnegative().default(500),
});
export type CompressionConfig = z.infer<typeof CompressionConfigSchema>;

export const CompressionStatsSchema = z.object({
  fullCount: z.number().int().nonnegative(),
  summaryCount: z.number().int().nonnegative(),
  keywordsCount: z.number().int().nonnegative(),
  droppedCount: z.number().int().nonnegative(),
  originalTokens: z.number().int().nonnegative(),
  compressedTokens: z.number().int().nonnegative(),
  savingsPercent: z.number().min(0).max(100),
});
export type CompressionStats = z.infer<typeof CompressionStatsSchema>;

export const CompressedContextSchema = z.object({
  chunks: z.array(CompressedChunkSchema),
  totalTokenCount: z.number().int().nonnegative(),
  stats: CompressionStatsSchema,
});
export type CompressedContext = z.infer<typeof CompressedContextSchema>;
