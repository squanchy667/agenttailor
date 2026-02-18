import type { Request, Response, NextFunction } from 'express';
import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Local auth middleware — no external auth provider required.
 * Creates/finds a default local user and attaches to req.user.
 */

const LOCAL_USER_EMAIL = 'local@agenttailor.dev';
const LOCAL_USER_NAME = 'Local User';

// In-memory cache to avoid DB lookup on every request
let cachedUser: User | null = null;

/**
 * No-op middleware that replaces Clerk's global clerkMiddleware().
 * Just passes through — no auth headers checked.
 */
export function localClerkAuth(_req: Request, _res: Response, next: NextFunction) {
  next();
}

/**
 * Finds or creates the default local user and attaches to req.user.
 */
export async function localAttachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!cachedUser) {
      cachedUser = await prisma.user.findUnique({
        where: { email: LOCAL_USER_EMAIL },
      });

      if (!cachedUser) {
        cachedUser = await prisma.user.create({
          data: {
            email: LOCAL_USER_EMAIL,
            name: LOCAL_USER_NAME,
            plan: 'PRO',
          },
        });
        console.log('Created default local user:', cachedUser.id);
      }
    }

    req.user = cachedUser;
    next();
  } catch (error) {
    console.error('Error in localAttachUser middleware:', error);
    next(error);
  }
}

/**
 * Combined middleware matching the shape of `authenticatedUser` from auth.ts.
 * Array of [localAttachUser] — no requireAuth needed in local mode.
 */
export const localAuthenticatedUser = [localAttachUser];
