/**
 * Config Library routes
 * GET    /api/configs/library      — Browse curated config library
 * GET    /api/configs/library/:id  — Get config template details
 * POST   /api/configs/search       — Search online for configs (standalone)
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticatedUser } from '../middleware/authMode.js';
import { searchConfigLibrary, getConfigTemplate } from '../services/configLibrary.js';
import { discoverConfigs } from '../services/configDiscovery.js';
import type { AgentFormat } from '@prisma/client';

const router = Router();

/**
 * GET /api/configs/library
 * Browse curated config templates with filtering.
 */
router.get('/library', ...authenticatedUser, async (req: Request, res: Response) => {
  try {
    const stack = req.query['stack']
      ? (req.query['stack'] as string).split(',').map((s) => s.trim())
      : undefined;
    const domain = req.query['domain'] as string | undefined;
    const category = req.query['category'] as string | undefined;
    const format = req.query['format'] as AgentFormat | undefined;
    const isBuiltIn = req.query['isBuiltIn'] === 'true' ? true : req.query['isBuiltIn'] === 'false' ? false : undefined;
    const query = req.query['q'] as string | undefined;
    const limit = Math.min(100, parseInt((req.query['limit'] as string) ?? '20', 10) || 20);
    const offset = parseInt((req.query['offset'] as string) ?? '0', 10) || 0;

    const result = await searchConfigLibrary({
      stack,
      domain,
      category,
      format,
      isBuiltIn,
      query,
      limit,
      offset,
    });

    return res.json({ data: result });
  } catch (error) {
    console.error('[routes/configs] GET /library error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to search config library' },
    });
  }
});

/**
 * GET /api/configs/library/:id
 * Get a single config template.
 */
router.get('/library/:id', ...authenticatedUser, async (req: Request, res: Response) => {
  try {
    const template = await getConfigTemplate(req.params['id']!);
    if (!template) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Config template not found' },
      });
    }
    return res.json({ data: template });
  } catch (error) {
    console.error('[routes/configs] GET /library/:id error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve config template' },
    });
  }
});

/**
 * POST /api/configs/search
 * Search online for configs (standalone discovery).
 * Body: { stack: string[], role?: string, domain?: string }
 */
router.post('/search', ...authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { stack, role, domain } = req.body as {
      stack?: string[];
      role?: string;
      domain?: string;
    };

    if (!stack || !Array.isArray(stack) || stack.length === 0) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'stack array is required' },
      });
    }

    const configs = await discoverConfigs(stack, role, domain, { maxResults: 10 });
    return res.json({ data: { configs, count: configs.length } });
  } catch (error) {
    console.error('[routes/configs] POST /search error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Config search failed' },
    });
  }
});

export default router;
