import { Router } from 'express';
import { clerkAuth } from '../middleware/auth.js';
import authRoutes from './auth.js';
import projectRoutes from './projects.js';

/**
 * Central router that mounts all API routes
 */

const router = Router();

// Apply Clerk middleware globally to all API routes
// This makes auth context available but doesn't require authentication
router.use(clerkAuth);

// Mount route modules
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);

// API version info (unprotected)
router.get('/info', (_req, res) => {
  res.json({
    data: {
      name: 'AgentTailor API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;
