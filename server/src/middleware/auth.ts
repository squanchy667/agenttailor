import type { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, getAuth } from '@clerk/express';
import { findUserByClerkId, createUser } from '../lib/db.js';

/**
 * Clerk authentication middleware
 * Modern @clerk/express API (v1+)
 */

// Export Clerk's base middleware for global application
export const clerkAuth = clerkMiddleware();

/**
 * Middleware that requires authentication and rejects unauthenticated requests
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);

  if (!auth || !auth.userId) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  next();
}

/**
 * Middleware that attaches the local User record to req.user
 * Must run after requireAuth
 * Creates user in local DB if not found (first-time login)
 */
export async function attachUser(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    const clerkId = auth.userId;

    // Look up user in local database
    let user = await findUserByClerkId(clerkId);

    // If user doesn't exist, create them (first-time login)
    if (!user) {
      // Get email from Clerk session claims
      // In production, you'd want to fetch full user data from Clerk API
      // For now, we'll use a placeholder email that should be updated via webhook
      const email = auth.sessionClaims?.email as string | undefined;

      if (!email) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'Email is required for user creation',
          },
        });
      }

      user = await createUser({
        clerkId,
        email,
        name: auth.sessionClaims?.name as string | undefined,
      });

      console.log('Created new user on first login:', user.id);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Error in attachUser middleware:', error);
    next(error);
  }
}

/**
 * Combined middleware: require auth + attach user
 * This is the most common pattern - use this for protected routes
 */
export const authenticatedUser = [requireAuth, attachUser];
