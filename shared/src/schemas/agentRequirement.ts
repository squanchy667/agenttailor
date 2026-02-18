/**
 * Agent Requirement schema — input for agent generation.
 * Describes what kind of agent the user wants to create.
 */
import { z } from 'zod';

export const AgentFormatSchema = z.enum(['CLAUDE_AGENT', 'CURSOR_RULES', 'SYSTEM_PROMPT']);
export type AgentFormat = z.infer<typeof AgentFormatSchema>;

export const AgentRequirementSchema = z.object({
  role: z.string().min(1).max(200).describe('Agent role, e.g. "React component builder"'),
  stack: z.array(z.string().min(1).max(50)).min(1).max(20).describe('Tech stack tags'),
  domain: z.string().min(1).max(100).describe('Domain, e.g. "web", "game", "api"'),
  description: z.string().min(1).max(5000).describe('Detailed description of what the agent should do'),
  targetFormat: AgentFormatSchema.describe('Output format for the generated agent'),
  projectId: z.string().optional().describe('Optional project to pull context from'),
});
export type AgentRequirement = z.infer<typeof AgentRequirementSchema>;
