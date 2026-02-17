/**
 * Web search schemas and types for Tavily/Brave search providers
 */
import { z } from 'zod';

/**
 * Web search query parameters
 */
export const WebSearchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().int().min(1).max(20).default(5),
  searchDepth: z.enum(['basic', 'advanced']).default('basic'),
  includeDomains: z.array(z.string()).optional(),
  excludeDomains: z.array(z.string()).optional(),
});
export type WebSearchQuery = z.infer<typeof WebSearchQuerySchema>;

/**
 * A single web search result
 */
export const WebSearchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  score: z.number().min(0).max(1),
  publishedDate: z.string().optional(),
  rawContent: z.string().optional(),
  provider: z.enum(['tavily', 'brave']),
});
export type WebSearchResult = z.infer<typeof WebSearchResultSchema>;

/**
 * Web search response envelope
 */
export const WebSearchResponseSchema = z.object({
  results: z.array(WebSearchResultSchema),
  query: z.string(),
  provider: z.string(),
  latencyMs: z.number(),
});
export type WebSearchResponse = z.infer<typeof WebSearchResponseSchema>;
