/**
 * MCP tool input/output schemas
 * Used by the MCP server package for tool definitions and validation.
 */
import { z } from 'zod';

// ── tailor_context ──────────────────────────────────────────────────────────

export const TailorContextInputSchema = z.object({
  task: z.string().min(1).describe('The task or question to assemble context for'),
  projectId: z.string().min(1).describe('The project ID to pull documents from'),
  maxTokens: z.number().int().positive().optional().default(4000).describe('Maximum tokens for the assembled context'),
  includeWebSearch: z.boolean().optional().default(true).describe('Whether to include web search results for gap filling'),
});
export type TailorContextInput = z.infer<typeof TailorContextInputSchema>;

export const TailorContextOutputSchema = z.object({
  context: z.string(),
  qualityScore: z.number().min(0).max(1).optional(),
  sources: z.array(
    z.object({
      title: z.string(),
      type: z.enum(['document', 'web', 'chunk']),
      relevance: z.number().min(0).max(1),
    }),
  ),
});
export type TailorContextOutput = z.infer<typeof TailorContextOutputSchema>;

// ── search_docs ─────────────────────────────────────────────────────────────

export const SearchDocsInputSchema = z.object({
  query: z.string().min(1).describe('Semantic search query'),
  projectId: z.string().min(1).describe('The project ID to search within'),
  topK: z.number().int().positive().optional().default(5).describe('Number of results to return'),
  minScore: z.number().min(0).max(1).optional().default(0.5).describe('Minimum relevance score threshold'),
});
export type SearchDocsInput = z.infer<typeof SearchDocsInputSchema>;

export const SearchDocsOutputSchema = z.object({
  results: z.array(
    z.object({
      content: z.string(),
      documentTitle: z.string(),
      chunkIndex: z.number().int().nonnegative(),
      score: z.number().min(0).max(1),
    }),
  ),
});
export type SearchDocsOutput = z.infer<typeof SearchDocsOutputSchema>;

// ── upload_document ─────────────────────────────────────────────────────────

export const UploadDocumentInputSchema = z.object({
  projectId: z.string().min(1).describe('The project to upload the document to'),
  fileName: z.string().min(1).describe('Name for the uploaded file'),
  content: z.string().min(1).describe('File content as plain text or base64'),
  mimeType: z.string().optional().default('text/plain').describe('MIME type of the file content'),
});
export type UploadDocumentInput = z.infer<typeof UploadDocumentInputSchema>;

export const UploadDocumentOutputSchema = z.object({
  documentId: z.string(),
  fileName: z.string(),
  status: z.enum(['processing', 'complete']),
  chunkCount: z.number().int().nonnegative().optional(),
});
export type UploadDocumentOutput = z.infer<typeof UploadDocumentOutputSchema>;
