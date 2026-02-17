/**
 * Tailor routes
 * POST   /api/tailor          — Full tailoring pipeline
 * POST   /api/tailor/preview  — Lightweight preview (no LLM/compression)
 * GET    /api/tailor/sessions — List user's sessions with pagination
 * GET    /api/tailor/sessions/:id — Get a single session by ID
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { TailorRequestSchema, TailorPreviewRequestSchema } from '@agenttailor/shared';
import { authenticatedUser } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { tailorContext, previewTailor } from '../services/tailorOrchestrator.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * POST /api/tailor
 * Full tailoring pipeline — returns assembled context with metadata.
 */
router.post(
  '/',
  authenticatedUser,
  validateRequest(TailorRequestSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Verify the user owns the project
      const project = await prisma.project.findFirst({
        where: { id: req.body.projectId, userId: req.user.id },
      });
      if (!project) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const result = await tailorContext(req.user.id, req.body);
      return res.json({ data: result });
    } catch (error) {
      console.error('[routes/tailor] POST / error:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Tailoring failed' },
      });
    }
  },
);

/**
 * POST /api/tailor/preview
 * Lightweight preview — no LLM calls, no compression, fast.
 */
router.post(
  '/preview',
  authenticatedUser,
  validateRequest(TailorPreviewRequestSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Verify the user owns the project
      const project = await prisma.project.findFirst({
        where: { id: req.body.projectId, userId: req.user.id },
      });
      if (!project) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const result = await previewTailor(req.user.id, req.body);
      return res.json({ data: result });
    } catch (error) {
      console.error('[routes/tailor] POST /preview error:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Preview failed' },
      });
    }
  },
);

/**
 * GET /api/tailor/sessions
 * List the calling user's tailoring sessions with pagination.
 * Query params: page (default 1), limit (default 20, max 100), projectId (optional filter)
 */
router.get('/sessions', authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const page = Math.max(1, parseInt((req.query['page'] as string) ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) ?? '20', 10) || 20));
    const projectId = req.query['projectId'] as string | undefined;

    const where = {
      userId: req.user.id,
      ...(projectId ? { projectId } : {}),
    };

    const [sessions, total] = await Promise.all([
      prisma.tailoringSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          projectId: true,
          taskInput: true,
          targetPlatform: true,
          tokenCount: true,
          qualityScore: true,
          createdAt: true,
        },
      }),
      prisma.tailoringSession.count({ where }),
    ]);

    return res.json({
      data: {
        sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[routes/tailor] GET /sessions error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list sessions' },
    });
  }
});

/**
 * GET /api/tailor/sessions/:id
 * Get a single tailoring session. Verifies ownership.
 */
router.get('/sessions/:id', authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const session = await prisma.tailoringSession.findFirst({
      where: { id: req.params['id'], userId: req.user.id },
    });

    if (!session) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    return res.json({ data: session });
  } catch (error) {
    console.error('[routes/tailor] GET /sessions/:id error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve session' },
    });
  }
});

export default router;
