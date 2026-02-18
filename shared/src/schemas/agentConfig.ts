/**
 * Agent Config schema — a generated agent definition.
 */
import { z } from 'zod';
import { AgentFormatSchema } from './agentRequirement.js';

export const AgentModelTierSchema = z.enum(['haiku', 'sonnet', 'opus']);
export type AgentModelTier = z.infer<typeof AgentModelTierSchema>;

export const SourceAttributionSchema = z.object({
  url: z.string().optional(),
  name: z.string(),
  type: z.enum(['curated', 'online', 'project']),
  relevanceScore: z.number().min(0).max(1).optional(),
});
export type SourceAttribution = z.infer<typeof SourceAttributionSchema>;

export const AgentConfigSchema = z.object({
  name: z.string().min(1).max(200),
  model: AgentModelTierSchema,
  mission: z.string().min(1).max(2000),
  tools: z.array(z.string()).default([]),
  conventions: z.array(z.string()).default([]),
  contextChunks: z.array(z.string()).default([]),
  format: AgentFormatSchema,
  sourceAttribution: z.array(SourceAttributionSchema).default([]),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const AgentConfigResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  projectId: z.string().nullable(),
  name: z.string(),
  role: z.string(),
  model: z.string(),
  format: AgentFormatSchema,
  content: z.string(),
  metadata: z.unknown().nullable(),
  qualityScore: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AgentConfigResponse = z.infer<typeof AgentConfigResponseSchema>;
