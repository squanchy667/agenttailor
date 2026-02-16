import { z } from 'zod';

/**
 * Zod schemas for Project-related data structures
 */

// Create project input
export const CreateProjectInput = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

// Update project input — all fields optional
export const UpdateProjectInput = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;

// Single project response shape
export const ProjectResponse = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  documentCount: z.number(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type ProjectResponse = z.infer<typeof ProjectResponse>;

// Paginated project list response
export const ProjectListResponse = z.object({
  data: z.array(ProjectResponse),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

export type ProjectListResponse = z.infer<typeof ProjectListResponse>;

// Query parameters for listing projects
export const ProjectListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type ProjectListQuery = z.infer<typeof ProjectListQuery>;
