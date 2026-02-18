import type { RequestHandler } from 'express';

/**
 * Auth mode router — switches between local and Clerk auth based on AUTH_MODE env var.
 * Default: local (no external auth provider required).
 */

const AUTH_MODE = process.env.AUTH_MODE ?? 'local';

let clerkAuth: RequestHandler;
let authenticatedUser: RequestHandler[];

if (AUTH_MODE === 'clerk') {
  // SaaS mode: use Clerk authentication
  const clerk = await import('./auth.js');
  clerkAuth = clerk.clerkAuth;
  authenticatedUser = clerk.authenticatedUser;
} else {
  // Local mode: no-op auth, auto-created local user
  const local = await import('./localAuth.js');
  clerkAuth = local.localClerkAuth;
  authenticatedUser = local.localAuthenticatedUser;
}

export { clerkAuth, authenticatedUser, AUTH_MODE };
