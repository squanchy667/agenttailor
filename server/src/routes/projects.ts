import { Router } from 'express';
import type { Request, Response } from 'express';
import { CreateProjectInput, UpdateProjectInput, ProjectListQuery } from '@agenttailor/shared';
import { authenticatedUser } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { enforceMaxProjects } from '../middleware/planEnforcer.js';
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
} from '../services/projectService.js';

/**
 * Project CRUD routes
 * All routes require authentication via authenticatedUser middleware
 */

const router = Router();

/**
 * POST /api/projects
 * Create a new project
 */
router.post(
  '/',
  authenticatedUser,
  enforceMaxProjects,
  validateRequest(CreateProjectInput, 'body'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const project = await createProject(req.user.id, req.body);

      return res.status(201).json({
        data: {
          id: project.id,
          name: project.name,
          description: project.description,
          documentCount: project._count.documents,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error creating project:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create project',
        },
      });
    }
  },
);

/**
 * GET /api/projects
 * List projects with pagination and optional search
 */
router.get(
  '/',
  authenticatedUser,
  validateRequest(ProjectListQuery, 'query'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const { page, limit, search } = req.query as unknown as {
        page: number;
        limit: number;
        search?: string;
      };

      const { data, total } = await listProjects(req.user.id, { page, limit, search });

      return res.json({
        data: data.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          documentCount: project._count.documents,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        })),
        pagination: {
          total,
          page,
          limit,
        },
      });
    } catch (error) {
      console.error('Error listing projects:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list projects',
        },
      });
    }
  },
);

/**
 * GET /api/projects/:id
 * Get a single project by ID
 */
router.get(
  '/:id',
  authenticatedUser,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const projectId = req.params.id;
      if (!projectId) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Project ID is required' } });
      }

      const project = await getProject(req.user.id, projectId);

      if (!project) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      return res.json({
        data: {
          id: project.id,
          name: project.name,
          description: project.description,
          documentCount: project._count.documents,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch project',
        },
      });
    }
  },
);

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put(
  '/:id',
  authenticatedUser,
  validateRequest(UpdateProjectInput, 'body'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const projectId = req.params.id;
      if (!projectId) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Project ID is required' } });
      }

      const project = await updateProject(req.user.id, projectId, req.body);

      if (!project) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      return res.json({
        data: {
          id: project.id,
          name: project.name,
          description: project.description,
          documentCount: project._count.documents,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error updating project:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update project',
        },
      });
    }
  },
);

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete(
  '/:id',
  authenticatedUser,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const projectId = req.params.id;
      if (!projectId) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Project ID is required' } });
      }

      const deleted = await deleteProject(req.user.id, projectId);

      if (!deleted) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting project:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete project',
        },
      });
    }
  },
);

export default router;
