/**
 * Agent routes
 * POST   /api/agents/generate     — Full agent generation pipeline
 * POST   /api/agents/preview      — Quick estimate (no LLM)
 * GET    /api/agents               — List user's generated agents
 * GET    /api/agents/:id           — Get agent details
 * POST   /api/agents/:id/export   — Re-export in different format
 * DELETE /api/agents/:id           — Delete agent
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { AgentRequirementSchema } from '@agenttailor/shared';
import { authenticatedUser } from '../middleware/authMode.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { generateAgentPipeline, previewAgentGeneration } from '../services/agentOrchestrator.js';
import { exportAgent } from '../services/formatExporter.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * POST /api/agents/generate
 * Full agent generation pipeline.
 */
router.post(
  '/generate',
  ...authenticatedUser,
  validateRequest(AgentRequirementSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const result = await generateAgentPipeline(req.user.id, req.body);
      return res.json({ data: result });
    } catch (error) {
      console.error('[routes/agents] POST /generate error:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Agent generation failed' },
      });
    }
  },
);

/**
 * POST /api/agents/preview
 * Quick preview — no LLM calls, fast estimate.
 */
router.post(
  '/preview',
  ...authenticatedUser,
  validateRequest(AgentRequirementSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const result = await previewAgentGeneration(req.user.id, req.body);
      return res.json({ data: result });
    } catch (error) {
      console.error('[routes/agents] POST /preview error:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Preview failed' },
      });
    }
  },
);

/**
 * GET /api/agents
 * List the calling user's generated agents.
 */
router.get('/', ...authenticatedUser, async (req: Request, res: Response) => {
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

    const [agents, total] = await Promise.all([
      prisma.agentConfig.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          role: true,
          model: true,
          format: true,
          qualityScore: true,
          projectId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.agentConfig.count({ where }),
    ]);

    return res.json({
      data: {
        agents,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('[routes/agents] GET / error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list agents' },
    });
  }
});

/**
 * GET /api/agents/:id
 * Get full agent details.
 */
router.get('/:id', ...authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const agent = await prisma.agentConfig.findFirst({
      where: { id: req.params['id'], userId: req.user.id },
    });

    if (!agent) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    return res.json({ data: agent });
  } catch (error) {
    console.error('[routes/agents] GET /:id error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve agent' },
    });
  }
});

/**
 * POST /api/agents/:id/export
 * Re-export an existing agent in a different format.
 * Body: { format: 'CLAUDE_AGENT' | 'CURSOR_RULES' | 'SYSTEM_PROMPT' }
 */
router.post('/:id/export', ...authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const agent = await prisma.agentConfig.findFirst({
      where: { id: req.params['id'], userId: req.user.id },
    });

    if (!agent) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    const format = req.body.format;
    if (!['CLAUDE_AGENT', 'CURSOR_RULES', 'SYSTEM_PROMPT'].includes(format)) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Invalid format. Must be CLAUDE_AGENT, CURSOR_RULES, or SYSTEM_PROMPT' },
      });
    }

    const metadata = agent.metadata as Record<string, unknown> | null;
    const agentConfig = {
      name: agent.name,
      model: agent.model as 'haiku' | 'sonnet' | 'opus',
      mission: '', // Will be extracted from content
      tools: (metadata?.['tools'] as string[]) ?? [],
      conventions: [],
      contextChunks: [],
      format: format as 'CLAUDE_AGENT' | 'CURSOR_RULES' | 'SYSTEM_PROMPT',
      sourceAttribution: [],
    };

    // If the current format matches, return existing content
    if (agent.format === format) {
      return res.json({ data: { content: agent.content, format } });
    }

    const exported = exportAgent(agentConfig);
    return res.json({ data: { content: exported, format } });
  } catch (error) {
    console.error('[routes/agents] POST /:id/export error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Export failed' },
    });
  }
});

/**
 * DELETE /api/agents/:id
 */
router.delete('/:id', ...authenticatedUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const agent = await prisma.agentConfig.findFirst({
      where: { id: req.params['id'], userId: req.user.id },
    });

    if (!agent) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Agent not found' },
      });
    }

    await prisma.agentConfig.delete({ where: { id: agent.id } });
    return res.json({ data: { success: true } });
  } catch (error) {
    console.error('[routes/agents] DELETE /:id error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Delete failed' },
    });
  }
});

export default router;
