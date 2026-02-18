/**
 * GPT Action routes — simplified endpoints for Custom GPT integration.
 *
 * POST /gpt/tailor    — Tailored context assembly
 * POST /gpt/search    — Semantic document search
 * GET  /gpt/projects  — List user's projects
 * GET  /gpt/health    — Health check (no auth)
 *
 * All endpoints except /health require X-Api-Key authentication.
 * Responses include a _help field with usage guidance for the GPT.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { GptTailorRequestSchema, GptSearchRequestSchema } from '@agenttailor/shared';
import { gptAuth } from '../middleware/gptAuth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { tailorContext } from '../services/tailorOrchestrator.js';
import { searchDocuments } from '../services/searchService.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * POST /gpt/tailor
 * Full tailoring pipeline with simplified response for GPT consumption.
 */
router.post(
  '/tailor',
  gptAuth,
  validateRequest(GptTailorRequestSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { task, projectId, maxTokens } = req.body as {
        task: string;
        projectId: string;
        maxTokens: number;
      };

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user.id },
      });
      if (!project) {
        return res.status(404).json({
          error: `Project not found. Use GET /gpt/projects to see available projects.`,
        });
      }

      const result = await tailorContext(req.user.id, {
        taskInput: task,
        projectId,
        targetPlatform: 'chatgpt',
        options: { maxTokens, includeWebSearch: true },
      });

      return res.json({
        context: result.context,
        sourceCount: result.metadata.chunksIncluded,
        topSources: result.sections.slice(0, 5).map((s) => ({
          title: s.name,
          type: 'document' as const,
        })),
        qualityScore: result.metadata.qualityScore,
        _help: 'Use this context to answer the user\'s question. Cite sources when possible. Quality score indicates context completeness (1.0 = excellent).',
      });
    } catch (error) {
      console.error('[gpt/tailor] Error:', error);
      return res.status(500).json({
        error: 'Tailoring failed. The server may be overloaded — try again shortly.',
      });
    }
  },
);

/**
 * POST /gpt/search
 * Semantic search with truncated results for token efficiency.
 */
router.post(
  '/search',
  gptAuth,
  validateRequest(GptSearchRequestSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { query, projectId, topK } = req.body as {
        query: string;
        projectId: string;
        topK: number;
      };

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user.id },
      });
      if (!project) {
        return res.status(404).json({
          error: `Project not found. Use GET /gpt/projects to see available projects.`,
        });
      }

      const result = await searchDocuments(req.user.id, {
        query,
        projectId,
        topK,
      });

      return res.json({
        results: result.results.map((r) => ({
          content: r.content.length > 500 ? r.content.slice(0, 497) + '...' : r.content,
          source: r.documentFilename ?? 'Unknown',
          relevance: Math.round(r.score * 100) / 100,
        })),
        _help: 'These are the most relevant document chunks matching your query. Use them to answer the user\'s question with citations.',
      });
    } catch (error) {
      console.error('[gpt/search] Error:', error);
      return res.status(500).json({
        error: 'Search failed. Try a different query or check that the project has documents.',
      });
    }
  },
);

/**
 * GET /gpt/projects
 * List user's projects with document counts.
 */
router.get(
  '/projects',
  gptAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const projects = await prisma.project.findMany({
        where: { userId: req.user.id },
        select: {
          id: true,
          name: true,
          _count: { select: { documents: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return res.json({
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          documentCount: p._count.documents,
        })),
        _help: 'Use a project ID from this list as the projectId parameter for /gpt/tailor or /gpt/search.',
      });
    } catch (error) {
      console.error('[gpt/projects] Error:', error);
      return res.status(500).json({
        error: 'Failed to list projects.',
      });
    }
  },
);

/**
 * GET /gpt/health
 * Health check endpoint. No authentication required.
 * GPT Builder uses this to verify connectivity.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    tools: ['tailor', 'search', 'projects'],
  });
});

export default router;
