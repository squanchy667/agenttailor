/**
 * Agent Session schema — tracks a full agent generation session.
 */
import { z } from 'zod';
import { AgentFormatSchema } from './agentRequirement.js';

export const AgentSessionSchema = z.object({
  userId: z.string(),
  projectId: z.string().optional(),
  requirement: z.unknown().describe('AgentRequirement JSON'),
  configSources: z.array(z.unknown()).default([]).describe('Scored online config sources'),
  generatedAgent: z.string(),
  exportFormat: AgentFormatSchema,
  qualityScore: z.number().min(0).max(1).optional(),
  metadata: z.unknown().optional(),
});
export type AgentSession = z.infer<typeof AgentSessionSchema>;

export const AgentSessionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  projectId: z.string().nullable(),
  requirement: z.unknown(),
  configSources: z.array(z.unknown()),
  generatedAgent: z.string(),
  exportFormat: AgentFormatSchema,
  qualityScore: z.number().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string(),
});
export type AgentSessionResponse = z.infer<typeof AgentSessionResponseSchema>;
