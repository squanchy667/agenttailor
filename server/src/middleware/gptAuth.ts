/**
 * API key authentication middleware for GPT Actions.
 * GPT Actions send auth via X-Api-Key header.
 *
 * Validates against AGENTTAILOR_API_KEY env var and resolves the user
 * by AGENTTAILOR_API_USER_ID. When a full API key management system is
 * added (Phase 8), this will be replaced with database lookups.
 */

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export async function gptAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    return res.status(401).json({
      error: 'Invalid API key. Provide a valid key via the X-Api-Key header.',
    });
  }

  const expectedKey = process.env['AGENTTAILOR_API_KEY'];
  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({
      error: 'Invalid API key. The provided key does not match.',
    });
  }

  try {
    // Resolve user by configured user ID
    const userId = process.env['AGENTTAILOR_API_USER_ID'];
    if (!userId) {
      return res.status(500).json({
        error: 'Server misconfigured: AGENTTAILOR_API_USER_ID not set.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({
        error: 'API key is valid but the associated user was not found.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[gptAuth] Error:', error);
    return res.status(500).json({
      error: 'Internal server error during authentication.',
    });
  }
}
