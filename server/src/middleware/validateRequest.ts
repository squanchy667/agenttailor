import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Generic Zod validation middleware for Express request data
 */

type RequestLocation = 'body' | 'query' | 'params';

export function validateRequest(schema: ZodSchema, location: RequestLocation = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[location];
    const result = schema.safeParse(data);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: result.error.format(),
        },
      });
    }

    // Replace the request data with the validated & parsed data
    req[location] = result.data;
    next();
  };
}
