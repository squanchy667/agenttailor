import { z } from 'zod';

export const ModelConfigSchema = z.object({
  modelId: z.string(),
  maxContextTokens: z.number().int().positive(),
  reservedForResponse: z.number().int().nonnegative(),
  reservedForConversation: z.number().int().nonnegative(),
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'gpt-4': {
    modelId: 'gpt-4',
    maxContextTokens: 128_000,
    reservedForResponse: 4_000,
    reservedForConversation: 8_000,
  },
  'gpt-4o': {
    modelId: 'gpt-4o',
    maxContextTokens: 128_000,
    reservedForResponse: 16_000,
    reservedForConversation: 8_000,
  },
  'claude-sonnet': {
    modelId: 'claude-sonnet',
    maxContextTokens: 200_000,
    reservedForResponse: 8_000,
    reservedForConversation: 16_000,
  },
  'claude-opus': {
    modelId: 'claude-opus',
    maxContextTokens: 200_000,
    reservedForResponse: 8_000,
    reservedForConversation: 16_000,
  },
};

export const BudgetAllocationStrategySchema = z.enum(['PROPORTIONAL', 'PRIORITY']);
export type BudgetAllocationStrategy = z.infer<typeof BudgetAllocationStrategySchema>;

export const TokenBudgetSchema = z.object({
  totalAvailable: z.number().int().nonnegative(),
  allocations: z.record(z.string(), z.number()),
  used: z.record(z.string(), z.number()),
  remaining: z.number().int(),
});
export type TokenBudget = z.infer<typeof TokenBudgetSchema>;

export const DEFAULT_SECTION_PROPORTIONS: Record<string, number> = {
  systemPrompt: 0.05,
  projectDocs: 0.50,
  webResults: 0.20,
  examples: 0.15,
  formatting: 0.10,
};
