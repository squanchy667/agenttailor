import { z } from 'zod';

export const EmbeddingConfigSchema = z.object({
  model: z.string().default('text-embedding-ada-002'),
  dimensions: z.number().default(1536),
  batchSize: z.number().default(100),
});
export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

export const EmbeddingResultSchema = z.object({
  chunkId: z.string(),
  embedding: z.array(z.number()),
  tokenCount: z.number(),
});
export type EmbeddingResult = z.infer<typeof EmbeddingResultSchema>;

export const VectorSearchResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  metadata: z.record(z.unknown()).optional(),
});
export type VectorSearchResult = z.infer<typeof VectorSearchResultSchema>;
