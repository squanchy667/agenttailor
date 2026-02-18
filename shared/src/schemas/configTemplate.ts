/**
 * Config Template schema — a curated library entry of proven agent configs.
 */
import { z } from 'zod';
import { AgentFormatSchema } from './agentRequirement.js';

export const ConfigTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100).describe('scaffold, backend, frontend, llm, etc.'),
  stack: z.array(z.string()).min(1),
  domain: z.string().min(1).max(100),
  format: AgentFormatSchema,
  content: z.string().min(1),
  source: z.string().url().optional(),
  rating: z.number().min(0).max(5).default(0),
  usageCount: z.number().int().nonnegative().default(0),
  isBuiltIn: z.boolean().default(false),
});
export type ConfigTemplate = z.infer<typeof ConfigTemplateSchema>;

export const ConfigTemplateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  stack: z.array(z.string()),
  domain: z.string(),
  format: AgentFormatSchema,
  content: z.string(),
  source: z.string().nullable(),
  rating: z.number(),
  usageCount: z.number(),
  isBuiltIn: z.boolean(),
  createdAt: z.string(),
});
export type ConfigTemplateResponse = z.infer<typeof ConfigTemplateResponseSchema>;
