import { z } from 'zod';

export const TaskTypeSchema = z.enum([
  'CODING',
  'WRITING',
  'ANALYSIS',
  'RESEARCH',
  'DEBUGGING',
  'DESIGN',
  'PLANNING',
  'OTHER',
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const ComplexityLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXPERT']);
export type ComplexityLevel = z.infer<typeof ComplexityLevelSchema>;

export const KnowledgeDomainSchema = z.enum([
  'FRONTEND',
  'BACKEND',
  'DATABASE',
  'DEVOPS',
  'SECURITY',
  'TESTING',
  'DESIGN',
  'ARCHITECTURE',
  'DOCUMENTATION',
  'BUSINESS',
  'DATA_SCIENCE',
  'GENERAL',
]);
export type KnowledgeDomain = z.infer<typeof KnowledgeDomainSchema>;

export const TaskAnalysisSchema = z.object({
  taskType: TaskTypeSchema,
  complexity: ComplexityLevelSchema,
  domains: z.array(KnowledgeDomainSchema),
  keyEntities: z.array(z.string()),
  suggestedSearchQueries: z.array(z.string()).min(2).max(4),
  estimatedTokenBudget: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
});
export type TaskAnalysis = z.infer<typeof TaskAnalysisSchema>;
