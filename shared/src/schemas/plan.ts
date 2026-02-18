/**
 * Plan tier definitions and limits.
 * Used by rate limiter and plan enforcer middleware.
 */
import { z } from 'zod';

export const PlanTierSchema = z.enum(['FREE', 'PRO', 'TEAM']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export interface PlanLimits {
  dailyRequests: number;
  maxProjects: number;
  maxDocsPerProject: number;
  maxDocSizeMb: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: { dailyRequests: 50, maxProjects: 3, maxDocsPerProject: 20, maxDocSizeMb: 5 },
  PRO: { dailyRequests: 500, maxProjects: 20, maxDocsPerProject: 100, maxDocSizeMb: 25 },
  TEAM: { dailyRequests: 2000, maxProjects: 100, maxDocsPerProject: 500, maxDocSizeMb: 50 },
};

export const RateLimitInfoSchema = z.object({
  limit: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  reset: z.string().datetime().describe('UTC timestamp when the limit resets'),
  retryAfter: z.number().int().nonnegative().describe('Seconds until reset'),
});
export type RateLimitInfo = z.infer<typeof RateLimitInfoSchema>;
