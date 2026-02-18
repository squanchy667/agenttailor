import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  FullSettingsSchema,
  ApiKeyInputSchema,
  DEFAULT_SETTINGS,
} from '@agenttailor/shared';
import { authenticatedUser } from '../middleware/authMode.js';
import { validateRequest } from '../middleware/validateRequest.js';

/**
 * Settings routes
 * All routes require authentication via authenticatedUser middleware.
 * No database persistence yet — returns defaults and echoes back validated input.
 */

const router = Router();

/**
 * GET /api/settings
 * Returns the user's settings (defaults for now — no persistence yet)
 */
router.get(
  '/',
  authenticatedUser,
  (_req: Request, res: Response) => {
    return res.json({
      data: {
        ...DEFAULT_SETTINGS,
        apiKeys: [] as { provider: string; maskedKey: string; createdAt: string }[],
      },
    });
  },
);

/**
 * PUT /api/settings
 * Validates and echoes back user settings (no persistence yet)
 */
router.put(
  '/',
  authenticatedUser,
  validateRequest(FullSettingsSchema, 'body'),
  (req: Request, res: Response) => {
    const validated = req.body as typeof DEFAULT_SETTINGS;
    return res.json({ data: validated });
  },
);

/**
 * POST /api/settings/api-keys
 * Accepts an API key and returns a masked version (no persistence yet)
 */
router.post(
  '/api-keys',
  authenticatedUser,
  validateRequest(ApiKeyInputSchema, 'body'),
  (req: Request, res: Response) => {
    const { provider, key } = req.body as { provider: 'tavily' | 'brave'; key: string };

    // Mask the key: show first 4 + "****" + last 4 characters
    const maskedKey =
      key.length > 8
        ? `${key.slice(0, 4)}****${key.slice(-4)}`
        : `${key.slice(0, 2)}****`;

    return res.status(201).json({
      data: {
        provider,
        maskedKey,
        createdAt: new Date().toISOString(),
      },
    });
  },
);

/**
 * DELETE /api/settings/api-keys/:provider
 * Removes an API key (no persistence yet — just returns 204)
 */
router.delete(
  '/api-keys/:provider',
  authenticatedUser,
  (_req: Request, res: Response) => {
    return res.status(204).send();
  },
);

export default router;
