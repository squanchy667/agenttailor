import { z } from 'zod';

/**
 * Zod schemas for user settings and preferences
 */

// General user preferences (named to avoid clash with user.ts UserSettingsSchema)
export const UserPreferencesSchema = z.object({
  defaultProjectId: z.string().optional(),
  preferredPlatform: z.enum(['chatgpt', 'claude']).default('chatgpt'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// Context assembly preferences
export const ContextPreferencesSchema = z.object({
  maxChunks: z.number().int().min(5).max(50).default(20),
  compressionLevel: z.enum(['none', 'light', 'aggressive']).default('light'),
  webSearchEnabled: z.boolean().default(true),
  webSearchMaxResults: z.number().int().min(1).max(10).default(5),
  chunkWeightThreshold: z.number().min(0.1).max(0.9).default(0.3),
});

export type ContextPreferences = z.infer<typeof ContextPreferencesSchema>;

// API key input (for saving a key)
export const ApiKeyInputSchema = z.object({
  provider: z.enum(['tavily', 'brave']),
  key: z.string().min(1, 'API key is required'),
});

export type ApiKeyInput = z.infer<typeof ApiKeyInputSchema>;

// Masked API key (for displaying saved keys)
export const MaskedApiKeySchema = z.object({
  provider: z.enum(['tavily', 'brave']),
  maskedKey: z.string(),
  createdAt: z.string(),
});

export type MaskedApiKey = z.infer<typeof MaskedApiKeySchema>;

// Notification preferences
export const NotificationPreferencesSchema = z.object({
  emailOnProcessingComplete: z.boolean().default(false),
  emailOnProcessingError: z.boolean().default(true),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

// Combined settings schema
export const FullSettingsSchema = UserPreferencesSchema.merge(ContextPreferencesSchema).merge(
  NotificationPreferencesSchema
);

export type FullSettings = z.infer<typeof FullSettingsSchema>;

// Default settings
export const DEFAULT_SETTINGS: FullSettings = {
  preferredPlatform: 'chatgpt',
  theme: 'system',
  maxChunks: 20,
  compressionLevel: 'light',
  webSearchEnabled: true,
  webSearchMaxResults: 5,
  chunkWeightThreshold: 0.3,
  emailOnProcessingComplete: false,
  emailOnProcessingError: true,
};
