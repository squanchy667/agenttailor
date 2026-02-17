import { z } from 'zod';

export const SourceTypeSchema = z.enum([
  'PROJECT_DOC',
  'WEB_SEARCH',
  'API_RESPONSE',
  'USER_INPUT',
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const ContextSourceSchema = z.object({
  sourceType: SourceTypeSchema,
  sourceId: z.string(),
  title: z.string(),
  url: z.string().optional(),
  timestamp: z.string().optional(),
  authorityScore: z.number().min(0).max(1),
});
export type ContextSource = z.infer<typeof ContextSourceSchema>;

export const ContradictionSchema = z.object({
  claim: z.string(),
  sources: z.array(z.string()),
  alternative: z.string(),
  alternativeSources: z.array(z.string()),
});
export type Contradiction = z.infer<typeof ContradictionSchema>;

export const SynthesizedBlockSchema = z.object({
  content: z.string(),
  sources: z.array(ContextSourceSchema),
  priority: z.number(),
  section: z.string(),
  contradictions: z.array(ContradictionSchema).optional(),
});
export type SynthesizedBlock = z.infer<typeof SynthesizedBlockSchema>;

export const SynthesizedContextSchema = z.object({
  blocks: z.array(SynthesizedBlockSchema),
  totalTokenCount: z.number().int().nonnegative(),
  sourceCount: z.number().int().nonnegative(),
  contradictionCount: z.number().int().nonnegative(),
  sections: z.array(z.string()),
});
export type SynthesizedContext = z.infer<typeof SynthesizedContextSchema>;
