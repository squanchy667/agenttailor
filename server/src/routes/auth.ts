import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticatedUser } from '../middleware/auth.js';
import { findUserByClerkId, createUser } from '../lib/db.js';
import { getAuth } from '@clerk/express';

/**
 * Auth routes for user authentication and profile management
 */

const router = Router();

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile from local database
 */
router.get('/me', authenticatedUser, async (req: Request, res: Response) => {
  try {
    // User is attached by authenticatedUser middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        },
      });
    }

    return res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        clerkId: user.clerkId,
        plan: user.plan,
        settings: user.settings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user profile',
      },
    });
  }
});

/**
 * POST /api/auth/sync
 * Force sync of Clerk user to local database
 * Useful for manual sync or after Clerk user updates
 */
router.post('/sync', authenticatedUser, async (req: Request, res: Response) => {
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
    const email = auth.sessionClaims?.email as string | undefined;
    const name = auth.sessionClaims?.name as string | undefined;

    if (!email) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Email is required for user sync',
        },
      });
    }

    // Check if user exists
    let user = await findUserByClerkId(clerkId);

    if (!user) {
      // Create user if doesn't exist
      user = await createUser({
        clerkId,
        email,
        name,
      });

      return res.status(201).json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          clerkId: user.clerkId,
          plan: user.plan,
          settings: user.settings,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        message: 'User created and synced',
      });
    }

    // User already exists
    return res.json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        clerkId: user.clerkId,
        plan: user.plan,
        settings: user.settings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      message: 'User already synced',
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to sync user',
      },
    });
  }
});

export default router;
