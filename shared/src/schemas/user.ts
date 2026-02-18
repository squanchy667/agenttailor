import { z } from 'zod';

/**
 * Zod schemas for User-related data structures
 */

// Plan enum validation
export const PlanSchema = z.enum(['FREE', 'PRO', 'TEAM']);

// User settings schema (flexible JSON structure)
export const UserSettingsSchema = z.record(z.unknown()).optional();

// User profile schema - matches Prisma User model
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  clerkId: z.string().nullable(),
  plan: PlanSchema,
  settings: z.unknown().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

// User creation input
export const CreateUserSchema = z.object({
  email: z.string().email(),
  clerkId: z.string().optional(),
  name: z.string().optional(),
  plan: PlanSchema.optional(),
});

// User update input
export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  plan: PlanSchema.optional(),
  settings: UserSettingsSchema,
});

// Inferred types
export type Plan = z.infer<typeof PlanSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
