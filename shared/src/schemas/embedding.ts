import { z } from 'zod';

const isLocalEmbedding = (typeof process !== 'undefined' && process.env?.EMBEDDING_PROVIDER === 'local') ||
  (typeof process !== 'undefined' && !process.env?.EMBEDDING_PROVIDER);

export const EmbeddingConfigSchema = z.object({
  model: z.string().default(isLocalEmbedding ? 'Xenova/all-MiniLM-L6-v2' : 'text-embedding-ada-002'),
  dimensions: z.number().default(isLocalEmbedding ? 384 : 1536),
  batchSize: z.number().default(isLocalEmbedding ? 32 : 100),
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
