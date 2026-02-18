/**
 * Redis-based rate limiter middleware.
 * Key format: ratelimit:{userId}:{YYYY-MM-DD}
 * Tracks daily request count per user with atomic INCR + EXPIRE.
 * Fails open if Redis is unavailable.
 */
import type { Request, Response, NextFunction } from 'express';
import type { RateLimitInfo } from '@agenttailor/shared';
import { getRedis } from '../lib/redis.js';

function todayKey(userId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `ratelimit:${userId}:${date}`;
}

function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCDate(midnight.getUTCDate() + 1);
  midnight.setUTCHours(0, 0, 0, 0);
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

function midnightUTCIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function setRateLimitHeaders(res: Response, info: RateLimitInfo): void {
  res.setHeader('X-RateLimit-Limit', info.limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, info.remaining));
  res.setHeader('X-RateLimit-Reset', info.reset);
}

/**
 * Create a rate limiter middleware for a given daily limit.
 */
export function rateLimiter(dailyLimit: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    const redis = getRedis();
    if (!redis) {
      // Fail open — allow request if Redis is unavailable
      next();
      return;
    }

    const key = todayKey(req.user.id);
    const ttl = secondsUntilMidnightUTC();

    try {
      const count = await redis.incr(key);

      // Set expiry on first increment
      if (count === 1) {
        await redis.expire(key, ttl);
      }

      const info: RateLimitInfo = {
        limit: dailyLimit,
        remaining: Math.max(0, dailyLimit - count),
        reset: midnightUTCIso(),
        retryAfter: count > dailyLimit ? ttl : 0,
      };

      setRateLimitHeaders(res, info);

      if (count > dailyLimit) {
        res.setHeader('Retry-After', ttl);
        res.status(429).json({
          error: 'Rate limit exceeded',
          rateLimit: info,
        });
        return;
      }

      next();
    } catch (err) {
      // Fail open on Redis errors
      console.warn('[rateLimiter] Redis error — allowing request:', err);
      next();
    }
  };
}
