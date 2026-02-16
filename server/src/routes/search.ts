/**
 * Semantic search routes
 * POST /api/search/docs    — Full search with content hydration
 * POST /api/search/suggest — Lightweight IDs + scores only
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { SearchRequestSchema, SuggestRequestSchema } from '@agenttailor/shared';
import { authenticatedUser } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { searchDocuments } from '../services/searchService.js';
import { createEmbedder } from '../services/embedding/embedder.js';
import { createVectorStore } from '../services/vectorStore/index.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * POST /api/search/docs
 * Full semantic search with content hydration, highlights, and metadata
 */
router.post(
  '/docs',
  authenticatedUser,
  validateRequest(SearchRequestSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const result = await searchDocuments(req.user.id, req.body);
      return res.json({ data: result });
    } catch (error) {
      if (error instanceof Error && error.message === 'PROJECT_NOT_FOUND') {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }
      console.error('Search error:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Search failed' },
      });
    }
  },
);

/**
 * POST /api/search/suggest
 * Lightweight search returning only chunk IDs and similarity scores
 */
router.post(
  '/suggest',
  authenticatedUser,
  validateRequest(SuggestRequestSchema, 'body'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
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
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      const embedder = createEmbedder();
      const embedding = await embedder.embedText(query);
      const vectorStore = createVectorStore();
      const results = await vectorStore.query(
        `project_${projectId}`,
        embedding,
        topK,
      );

      return res.json({
        data: {
          results: results.map((r) => ({ chunkId: r.id, score: r.score })),
        },
      });
    } catch (error) {
      console.error('Suggest error:', error);
      return res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Suggest failed' },
      });
    }
  },
);

export default router;
