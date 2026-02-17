import { z } from 'zod';

export const CitationTypeSchema = z.enum(['document', 'web']);
export type CitationType = z.infer<typeof CitationTypeSchema>;

export const CitationSchema = z.object({
  id: z.string(),
  type: CitationTypeSchema,
  sourceTitle: z.string(),
  sourceUrl: z.string().optional(),
  documentId: z.string().optional(),
  chunkIndex: z.number().int().nonnegative(),
  relevanceScore: z.number().min(0).max(1),
  searchQuery: z.string().optional(),
  fetchedAt: z.string().optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const CitedContextSchema = z.object({
  context: z.string(),
  citations: z.array(CitationSchema),
});
export type CitedContext = z.infer<typeof CitedContextSchema>;
