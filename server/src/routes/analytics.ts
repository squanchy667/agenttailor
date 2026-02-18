/**
 * Analytics routes
 * GET /api/analytics/sessions   — Sessions over time
 * GET /api/analytics/quality    — Quality score trend
 * GET /api/analytics/projects   — Per-project statistics
 * GET /api/analytics/usage      — Plan usage data
 * GET /api/analytics/summary    — Summary statistics
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticatedUser } from '../middleware/auth.js';
import {
  getSessionsOverTime,
  getQualityTrend,
  getProjectStats,
  getPlanUsage,
  getSummaryStats,
} from '../services/analyticsService.js';

const router = Router();

function parseDays(req: Request): number {
  const raw = parseInt(req.query['days'] as string, 10);
  if (!raw || raw < 1) return 30;
  return Math.min(raw, 365);
}

router.get('/sessions', authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const data = await getSessionsOverTime(req.user.id, parseDays(req));
    return res.json({ data });
  } catch (error) {
    console.error('[routes/analytics] GET /sessions error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch session analytics' } });
  }
});

router.get('/quality', authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const data = await getQualityTrend(req.user.id, parseDays(req));
    return res.json({ data });
  } catch (error) {
    console.error('[routes/analytics] GET /quality error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch quality analytics' } });
  }
});

router.get('/projects', authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const data = await getProjectStats(req.user.id);
    return res.json({ data });
  } catch (error) {
    console.error('[routes/analytics] GET /projects error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch project analytics' } });
  }
});

router.get('/usage', authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const data = await getPlanUsage(req.user.id);
    return res.json({ data });
  } catch (error) {
    console.error('[routes/analytics] GET /usage error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch usage analytics' } });
  }
});

router.get('/summary', authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const data = await getSummaryStats(req.user.id);
    return res.json({ data });
  } catch (error) {
    console.error('[routes/analytics] GET /summary error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch summary analytics' } });
  }
});

export default router;
