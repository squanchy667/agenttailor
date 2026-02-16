import type { User } from '@prisma/client';

/**
 * Express type extensions for custom request properties
 */

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user from local database
       * Attached by the attachUser middleware after Clerk auth
       */
      user?: User;
    }
  }
}

export {};
