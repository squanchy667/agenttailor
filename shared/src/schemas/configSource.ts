/**
 * Config Source schema — an online config source found via discovery.
 */
import { z } from 'zod';

export const ConfigSourceFormatSchema = z.enum([
  'claude-agent',
  'cursor-rules',
  'system-prompt',
  'custom-gpt',
]);
export type ConfigSourceFormat = z.infer<typeof ConfigSourceFormatSchema>;

export const ParsedConfigSchema = z.object({
  role: z.string().optional(),
  conventions: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([]),
  filePatterns: z.array(z.string()).default([]),
  raw: z.string(),
});
export type ParsedConfig = z.infer<typeof ParsedConfigSchema>;

export const ConfigSourceSchema = z.object({
  url: z.string().url(),
  format: ConfigSourceFormatSchema,
  rawContent: z.string(),
  parsedContent: ParsedConfigSchema,
  specificityScore: z.number().min(1).max(5),
  relevanceScore: z.number().min(1).max(5),
  combinedScore: z.number().min(2).max(10),
  fetchedAt: z.string().datetime(),
});
export type ConfigSource = z.infer<typeof ConfigSourceSchema>;
