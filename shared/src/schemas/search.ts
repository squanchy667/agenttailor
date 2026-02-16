/**
 * Search schemas and types for semantic document search
 */
import { z } from 'zod';

/**
 * POST /api/search/docs request body
 */
export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  projectId: z.string(),
  topK: z.number().int().min(1).max(50).default(10),
  filters: z
    .object({
      documentIds: z.array(z.string()).optional(),
      documentTypes: z.array(z.string()).optional(),
      minScore: z.number().min(0).max(1).optional(),
    })
    .optional(),
});
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

/**
 * A single search result with hydrated chunk + document data
 */
export const SearchResultSchema = z.object({
  chunkId: z.string(),
  documentId: z.string(),
  documentFilename: z.string(),
  content: z.string(),
  score: z.number(),
  metadata: z.record(z.unknown()).optional(),
  highlight: z.string(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Full search response envelope
 */
export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  totalFound: z.number(),
  queryTokenCount: z.number(),
  searchTimeMs: z.number(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

/**
 * POST /api/search/suggest request body — lightweight ID+score search
 */
export const SuggestRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  projectId: z.string(),
  topK: z.number().int().min(1).max(50).default(10),
});
export type SuggestRequest = z.infer<typeof SuggestRequestSchema>;

/**
 * Suggest response — chunk IDs and scores only (no content hydration)
 */
export const SuggestResponseSchema = z.object({
  results: z.array(
    z.object({
      chunkId: z.string(),
      score: z.number(),
    }),
  ),
});
export type SuggestResponse = z.infer<typeof SuggestResponseSchema>;
