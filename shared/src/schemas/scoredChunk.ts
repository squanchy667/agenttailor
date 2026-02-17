import { z } from 'zod';

export const ScoredChunkSchema = z.object({
  chunkId: z.string(),
  documentId: z.string(),
  content: z.string(),
  biEncoderScore: z.number(),
  crossEncoderScore: z.number(),
  finalScore: z.number(),
  metadata: z.record(z.unknown()).optional(),
  rank: z.number().int().nonnegative(),
});
export type ScoredChunk = z.infer<typeof ScoredChunkSchema>;

export const ScoringConfigSchema = z.object({
  candidateCount: z.number().int().positive().default(20),
  rerankCount: z.number().int().positive().default(20),
  returnCount: z.number().int().positive().default(10),
  biEncoderWeight: z.number().min(0).max(1).default(0.3),
  crossEncoderWeight: z.number().min(0).max(1).default(0.7),
});
export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;
