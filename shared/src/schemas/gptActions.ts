/**
 * GPT Action schemas
 * Simplified request/response types for Custom GPT integration.
 * Responses are compact to stay within GPT's processing limits.
 */
import { z } from 'zod';

// ── GPT Tailor ──────────────────────────────────────────────────────────────

export const GptTailorRequestSchema = z.object({
  task: z.string().min(1).max(2000),
  projectId: z.string().uuid(),
  maxTokens: z.number().int().positive().optional().default(3000),
});
export type GptTailorRequest = z.infer<typeof GptTailorRequestSchema>;

export const GptTailorResponseSchema = z.object({
  context: z.string(),
  sourceCount: z.number().int().nonnegative(),
  topSources: z.array(
    z.object({
      title: z.string(),
      type: z.enum(['document', 'web', 'chunk']),
    }),
  ),
  qualityScore: z.number().min(0).max(1),
  _help: z.string(),
});
export type GptTailorResponse = z.infer<typeof GptTailorResponseSchema>;

// ── GPT Search ──────────────────────────────────────────────────────────────

export const GptSearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  projectId: z.string().uuid(),
  topK: z.number().int().positive().optional().default(3),
});
export type GptSearchRequest = z.infer<typeof GptSearchRequestSchema>;

export const GptSearchResultItemSchema = z.object({
  content: z.string(),
  source: z.string(),
  relevance: z.number().min(0).max(1),
});

export const GptSearchResponseSchema = z.object({
  results: z.array(GptSearchResultItemSchema),
  _help: z.string(),
});
export type GptSearchResponse = z.infer<typeof GptSearchResponseSchema>;

// ── GPT Project List ────────────────────────────────────────────────────────

export const GptProjectListResponseSchema = z.object({
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      documentCount: z.number().int().nonnegative(),
    }),
  ),
  _help: z.string(),
});
export type GptProjectListResponse = z.infer<typeof GptProjectListResponseSchema>;
