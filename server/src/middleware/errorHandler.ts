import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Global error handler middleware
 * Standardizes error responses and maps common errors to appropriate HTTP status codes
 */

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.format(),
      },
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'A record with that value already exists',
          details: err.meta,
        },
      });
    }

    // P2025: Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
          details: err.meta,
        },
      });
    }

    // P2003: Foreign key constraint violation
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid reference to related record',
          details: err.meta,
        },
      });
    }

    // Generic Prisma error
    return res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database error occurred',
        details: process.env.NODE_ENV === 'development' ? err.meta : undefined,
      },
    });
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided',
      },
    });
  }

  // Generic server error
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred',
    },
  });
}
