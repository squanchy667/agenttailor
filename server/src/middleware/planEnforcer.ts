/**
 * Plan enforcement middleware.
 * Resolves user's plan tier, applies rate limit, and enforces structural limits.
 */
import type { Request, Response, NextFunction } from 'express';
import { PLAN_LIMITS } from '@agenttailor/shared';
import type { PlanTier } from '@agenttailor/shared';
import { prisma } from '../lib/prisma.js';
import { getRedis } from '../lib/redis.js';
import { rateLimiter } from './rateLimiter.js';

// ── Plan tier cache (Redis, 5-minute TTL) ────────────────────────────────────

const PLAN_CACHE_TTL = 300; // 5 minutes

async function getUserPlanTier(userId: string): Promise<PlanTier> {
  const redis = getRedis();

  if (redis) {
    const cacheKey = `plan:${userId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return cached as PlanTier;
    } catch {
      // Ignore cache errors
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    const tier = (user?.plan ?? 'FREE') as PlanTier;

    try {
      await redis.setex(cacheKey, PLAN_CACHE_TTL, tier);
    } catch {
      // Ignore cache errors
    }

    return tier;
  }

  // No Redis — query directly
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return (user?.plan ?? 'FREE') as PlanTier;
}

// ── Rate-limiting plan enforcer ──────────────────────────────────────────────

/**
 * Middleware that resolves the user's plan and applies daily rate limiting.
 * Use on endpoints that count against the daily request quota (e.g., tailor).
 */
export async function planRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  try {
    const tier = await getUserPlanTier(req.user.id);
    const limits = PLAN_LIMITS[tier];
    await rateLimiter(limits.dailyRequests)(req, res, next);
  } catch (err) {
    // Fail open
    console.warn('[planEnforcer] Error resolving plan — allowing request:', err);
    next();
  }
}

// ── Structural limit enforcers ───────────────────────────────────────────────

/**
 * Enforce max projects per plan tier.
 * Use on POST /api/projects (project creation).
 */
export async function enforceMaxProjects(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  try {
    const tier = await getUserPlanTier(req.user.id);
    const limits = PLAN_LIMITS[tier];
    const projectCount = await prisma.project.count({ where: { userId: req.user.id } });

    if (projectCount >= limits.maxProjects) {
      res.status(403).json({
        error: {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `Your ${tier} plan allows a maximum of ${limits.maxProjects} projects. Upgrade your plan to create more.`,
        },
      });
      return;
    }

    next();
  } catch (err) {
    console.warn('[planEnforcer] Error enforcing max projects:', err);
    next();
  }
}

/**
 * Enforce max documents per project and max file size for plan tier.
 * Use on document upload routes.
 * Expects req.params.projectId or req.body.projectId, and req.body.sizeBytes or req.file.size.
 */
export async function enforceDocumentLimits(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  try {
    const tier = await getUserPlanTier(req.user.id);
    const limits = PLAN_LIMITS[tier];

    // Check document count
    const projectId = req.params['projectId'] ?? req.body?.projectId;
    if (projectId) {
      const docCount = await prisma.document.count({ where: { projectId } });
      if (docCount >= limits.maxDocsPerProject) {
        res.status(403).json({
          error: {
            code: 'PLAN_LIMIT_EXCEEDED',
            message: `Your ${tier} plan allows a maximum of ${limits.maxDocsPerProject} documents per project. Upgrade your plan to add more.`,
          },
        });
        return;
      }
    }

    // Check file size
    const file = req.file as Express.Multer.File | undefined;
    const sizeBytes = file?.size ?? req.body?.sizeBytes;
    if (sizeBytes && sizeBytes > limits.maxDocSizeMb * 1024 * 1024) {
      res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: `Your ${tier} plan allows files up to ${limits.maxDocSizeMb}MB. Upgrade your plan for larger files.`,
        },
      });
      return;
    }

    next();
  } catch (err) {
    console.warn('[planEnforcer] Error enforcing document limits:', err);
    next();
  }
}
